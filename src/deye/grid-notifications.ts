import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service.js';
import { DeyeGridService } from './deye-grid.service.js';
import { DEYE_ITP_STATION_ID } from './deye.constants.js';
import { DeyeService } from './deye.service.js';
import {
  classifyGridVoltage,
  MAX_SAMPLE_AGE_SECONDS,
} from './grid-availability.js';
import type { GridState } from './grid-availability.js';
import { BatteryLogsService } from './battery-logs.service.js';

const POLL_INTERVAL_MS = 5 * 60_000;
const BATTERY_LOG_INTERVAL_MS = 60 * 60_000;

type KnownGridState = Exclude<GridState, 'unknown'>;
type StationMonitor = {
  id: number;
  messages: Record<KnownGridState, string>;
  requireAllPhases: boolean;
  measurePoints?: string[];
  deviceSn?: string;
  timer?: ReturnType<typeof setTimeout>;
  batteryTimer?: ReturnType<typeof setTimeout>;
  lastSampleTime: number;
  state?: KnownGridState;
};

@Injectable()
export class GridNotifications
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(GridNotifications.name);
  private stopped = false;
  private readonly stations: StationMonitor[] = [
    {
      id: DEYE_ITP_STATION_ID,
      requireAllPhases: true,
      measurePoints: ['GridVoltageL1', 'GridVoltageL2', 'GridVoltageL3'],
      lastSampleTime: 0,
      messages: {
        withGrid: '✅ Ліфти працюють',
        withoutGrid: '❌ Ліфти не працюють',
      },
    },
  ];

  constructor(
    @Inject(TelegramService) private readonly telegram: TelegramService,
    @Inject(DeyeService) private readonly deye: DeyeService,
    @Inject(DeyeGridService) private readonly grid: DeyeGridService,
    @Inject(BatteryLogsService) private readonly batteries: BatteryLogsService,
  ) {}

  onApplicationBootstrap() {
    if (!this.telegram.isConfigured) return;
    for (const station of this.stations) {
      void this.poll(station);
      void this.logBatteries(station);
    }
  }

  onModuleDestroy() {
    this.stopped = true;
    for (const station of this.stations) {
      clearTimeout(station.timer);
      clearTimeout(station.batteryTimer);
    }
  }

  private async logBatteries(station: StationMonitor) {
    try {
      await this.batteries.logForStation(station.id);
    } finally {
      if (!this.stopped) {
        station.batteryTimer = setTimeout(
          () => void this.logBatteries(station),
          BATTERY_LOG_INTERVAL_MS,
        );
      }
    }
  }

  private async poll(station: StationMonitor) {
    try {
      station.deviceSn ??= await this.grid.findInverter(station.id);
      station.measurePoints ??= await this.grid.getGridVoltagePoints(
        station.deviceSn,
      );
      const response = await this.deye.getDeviceLatest({
        deviceList: [station.deviceSn],
        deviceType: 'INVERTER',
      });
      const sample = response.deviceDataList?.find(
        (device) => device.deviceSn === station.deviceSn,
      );
      const time = sample?.collectionTime;
      if (
        this.stopped ||
        sample?.deviceState === 3 ||
        typeof time !== 'number' ||
        !Number.isSafeInteger(time) ||
        time < station.lastSampleTime
      )
        return;

      const age = Date.now() / 1000 - time;
      if (age < 0 || age > MAX_SAMPLE_AGE_SECONDS) return;
      const state = classifyGridVoltage(
        sample?.dataList,
        station.measurePoints,
        station.requireAllPhases,
      );
      if (state === 'unknown') return;
      station.lastSampleTime = time;

      const message = station.messages[state];
      if (station.state !== state) {
        await this.telegram.sendMessage(message);
      }
      station.state = state;
    } catch {
      this.logger.warn(
        `Could not check grid state or deliver notification for station ${station.id}`,
      );
    } finally {
      if (!this.stopped)
        station.timer = setTimeout(
          () => void this.poll(station),
          POLL_INTERVAL_MS,
        );
    }
  }
}
