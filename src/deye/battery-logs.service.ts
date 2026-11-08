import { Inject, Injectable, Logger } from '@nestjs/common';
import { DeyeService } from './deye.service.js';
import type { DeyeSchemas } from './deye.types.js';
import { MAX_SAMPLE_AGE_SECONDS } from './grid-availability.js';

type Measurement = DeyeSchemas['data'];

const MAX_CELL_KEYS = [
  'MAX_C_V',
  'MaxCellVoltage',
  'MaxCellVolt',
  'MaxCellV',
  'MaximumCellVoltage',
  'MaxSingleCellVoltage',
  'CellMaxVoltage',
  'CellVoltageMax',
  'BMSMaxCellVoltage',
];
const MIN_CELL_KEYS = [
  'MIN_C_V',
  'MinCellVoltage',
  'MinCellVolt',
  'MinCellV',
  'MinimumCellVoltage',
  'MinSingleCellVoltage',
  'CellMinVoltage',
  'CellVoltageMin',
  'BMSMinCellVoltage',
];

function normalize(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findMeasurement(readings: Measurement[], keys: string[]) {
  for (const key of keys) {
    const matches = readings.filter(
      (point) => normalize(point.key ?? '') === normalize(key),
    );
    if (matches.length === 1) return matches[0];
  }
}

function numberValue(point: Measurement | undefined) {
  const raw = point?.value;
  if (
    (typeof raw !== 'string' && typeof raw !== 'number') ||
    (typeof raw === 'string' && !raw.trim())
  )
    return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function cellVoltage(readings: Measurement[], keys: string[]) {
  const point = findMeasurement(readings, keys);
  const value = numberValue(point);
  if (value === undefined) return 'нет данных';
  if (point?.unit?.trim().toLowerCase() === 'mv') return `${value / 1000} V`;
  if (point?.unit?.trim().toLowerCase() === 'v') return `${value} V`;
  return 'нет данных';
}

@Injectable()
export class BatteryLogsService {
  private readonly logger = new Logger(BatteryLogsService.name);
  private readonly diagnosedBatteries = new Set<string>();

  constructor(@Inject(DeyeService) private readonly deye: DeyeService) {}

  async logForStation(stationId: number) {
    try {
      const batteries = await this.findBatteries(stationId);
      if (!batteries.length) {
        this.logger.warn(`Батареи станции ${stationId} не найдены`);
        return;
      }
      for (const battery of batteries) {
        try {
          const detail = await this.deye.getBatteryWebDetail(battery.deviceId);
          if (
            detail.deviceSn !== battery.deviceSn ||
            detail.siteId !== stationId
          ) {
            throw new Error(
              'Battery identity does not match the station device list',
            );
          }
          this.logBattery(stationId, battery.deviceSn, {
            deviceSn: detail.deviceSn,
            collectionTime: detail.collectionTime,
            deviceState: detail.connectStatus === 0 ? 3 : detail.deviceState,
            dataList: detail.paramCategoryList.flatMap((category) =>
              (category.fieldList ?? []).map((field) => ({
                key:
                  typeof field.storageName === 'string'
                    ? field.storageName
                    : undefined,
                value:
                  typeof field.value === 'string' ||
                  typeof field.value === 'number'
                    ? String(field.value)
                    : undefined,
                unit: typeof field.unit === 'string' ? field.unit : undefined,
              })),
            ),
          });
        } catch {
          this.logger.warn(
            `Не удалось прочитать батарею ${battery.deviceSn} (ID ${battery.deviceId}) станции ${stationId}`,
          );
        }
      }
    } catch {
      this.logger.warn(
        `Не удалось получить список батарей станции ${stationId}`,
      );
    }
  }

  private async findBatteries(stationId: number) {
    const batteries = new Map<string, { deviceSn: string; deviceId: number }>();
    for (let page = 1; page <= 100; page++) {
      const response = await this.deye.getStationDevices({
        stationIds: [stationId],
        page,
        size: 200,
      });
      if (!Array.isArray(response.deviceListItems))
        throw new Error('Invalid device list');
      for (const device of response.deviceListItems) {
        if (device.deviceType !== 'BATTERY' || !device.deviceSn) continue;
        if (
          device.deviceId === undefined ||
          !Number.isSafeInteger(device.deviceId) ||
          device.deviceId <= 0
        ) {
          this.logger.warn(
            `Батарея ${device.deviceSn} станции ${stationId}: отсутствует числовой deviceId`,
          );
          continue;
        }
        batteries.set(device.deviceSn, {
          deviceSn: device.deviceSn,
          deviceId: device.deviceId,
        });
      }
      if (
        response.deviceListItems.length < 200 ||
        (response.total !== undefined && page * 200 >= response.total)
      ) {
        return [...batteries.values()];
      }
    }
    throw new Error('Device pagination exceeded the limit');
  }

  private logBattery(
    stationId: number,
    serial: string,
    sample: DeyeSchemas['deviceLatestData'] | undefined,
  ) {
    const readings = sample?.dataList ?? [];
    const socPoint = findMeasurement(readings, [
      'BSC',
      'SOC',
      'BMSSOC',
      'BatterySOC',
      'StateOfCharge',
    ]);
    const soc = numberValue(socPoint);
    const validSoc =
      soc !== undefined &&
      soc <= 100 &&
      (!socPoint?.unit || socPoint.unit.trim() === '%');
    const time = sample?.collectionTime;
    const validTime =
      typeof time === 'number' &&
      Number.isSafeInteger(time) &&
      time > 0 &&
      time <= Date.now() / 1000;
    const current =
      validTime &&
      sample?.deviceState !== 3 &&
      Date.now() / 1000 - time <= MAX_SAMPLE_AGE_SECONDS;
    const maxCellVoltage = cellVoltage(readings, MAX_CELL_KEYS);
    const minCellVoltage = cellVoltage(readings, MIN_CELL_KEYS);
    this.logger.log(
      `Батарея ${serial} | станция ${stationId} | max cell V: ${maxCellVoltage}` +
        ` | min cell V: ${minCellVoltage} | SOC: ${validSoc ? `${soc} %` : 'нет данных'}` +
        ` | замер: ${validTime ? new Date(time * 1000).toISOString() : 'нет данных'}` +
        ` | данные: ${current ? 'актуальные' : 'устарели или недоступны'}`,
    );
    if (
      (maxCellVoltage === 'нет данных' ||
        minCellVoltage === 'нет данных' ||
        !validSoc) &&
      !this.diagnosedBatteries.has(serial)
    ) {
      this.diagnosedBatteries.add(serial);
      this.logger.warn(
        `Батарея ${serial} | диагностика Deye: ${JSON.stringify({
          reason: !sample
            ? 'device_missing_from_response'
            : !readings.length
              ? 'empty_measurements'
              : 'unrecognized_or_invalid_measurements',
          deviceState: sample?.deviceState,
          measurements: readings.map(({ key, value, unit }) => ({
            key,
            value,
            unit,
          })),
        })}`,
      );
    }
  }
}
