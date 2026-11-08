import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DeyeService } from './deye.service.js';
import { DeyeApiError, DeyeConfigurationError } from './deye.errors.js';
import {
  calculateGridAvailability,
  MAX_SAMPLE_AGE_SECONDS,
} from './grid-availability.js';
import type { DeyeSchemas } from './deye.types.js';

const DAY_SECONDS = 86400;
// Deye rejects an exact five-day difference (2101006), so stay below the limit.
const HISTORY_CHUNK_SECONDS = 5 * DAY_SECONDS - 1;
const MAX_PERIOD_SECONDS = 31 * DAY_SECONDS;
const VOLTAGE_POINTS = [
  'GridVoltageL1',
  'GridVoltageL2',
  'GridVoltageL3',
  'GridVoltageL1L2',
];

function parseDate(value: string | undefined, name: string) {
  // Require a timezone; bare dates and local times are ambiguous around DST changes.
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    throw new BadRequestException(
      `${name} must be an ISO date with timezone, e.g. 2026-10-28T00:00:00Z`,
    );
  }
  const milliseconds = Date.parse(value);
  const local = new Date(`${value.slice(0, 19)}Z`);
  if (
    !Number.isFinite(milliseconds) ||
    !Number.isFinite(local.getTime()) ||
    local.toISOString().slice(0, 19) !== value.slice(0, 19)
  ) {
    throw new BadRequestException(`${name} is not a valid date`);
  }
  return milliseconds / 1000;
}

@Injectable()
export class DeyeGridService {
  constructor(@Inject(DeyeService) private readonly deye: DeyeService) {}

  async getGridOutages(
    stationId: number,
    fromValue: string | undefined,
    toValue: string | undefined,
  ) {
    if (!Number.isSafeInteger(stationId) || stationId < 1) {
      throw new BadRequestException('stationId must be a positive integer');
    }
    const from = parseDate(fromValue, 'from');
    const to = parseDate(toValue, 'to');
    if (to <= from) throw new BadRequestException('to must be later than from');
    if (to > Date.now() / 1000)
      throw new BadRequestException('to must not be in the future');
    if (to - from > MAX_PERIOD_SECONDS)
      throw new BadRequestException('The maximum period is 31 days');

    try {
      const deviceSn = await this.findInverter(stationId);
      const measurePoints = await this.getGridVoltagePoints(deviceSn);
      const rows: DeyeSchemas['DeviceHistoryDataItem'][] = [];
      // Include a predecessor sample so a state at the beginning of the requested period is known.
      for (let start = from - MAX_SAMPLE_AGE_SECONDS; start < to;) {
        const end = Math.min(start + HISTORY_CHUNK_SECONDS, to);
        const history = await this.deye.getDeviceHistoryRaw({
          deviceSn,
          deviceType: 'INVERTER',
          startTimestamp: start,
          endTimestamp: end,
          measurePoints,
        });
        if (history.deviceSn !== deviceSn || !Array.isArray(history.dataList)) {
          throw new BadGatewayException(
            'Deye returned an invalid device history',
          );
        }
        rows.push(...history.dataList);
        start = end;
      }
      return {
        stationId,
        deviceSn,
        from: new Date(from * 1000).toISOString(),
        to: new Date(to * 1000).toISOString(),
        measurePoints,
        ...calculateGridAvailability(rows, measurePoints, from, to),
      };
    } catch (error) {
      if (error instanceof DeyeConfigurationError) {
        throw new ServiceUnavailableException(
          'Deye credentials are not configured',
        );
      }
      if (error instanceof DeyeApiError) {
        throw new BadGatewayException({
          message: 'Failed to read history from Deye Cloud',
          kind: error.kind,
          endpoint: error.endpoint,
          upstreamStatus: error.status,
          code: error.code,
          requestId: error.requestId,
        });
      }
      throw error;
    }
  }

  async getGridVoltagePoints(deviceSn: string) {
    const response = await this.deye.getDeviceMeasurePoints({
      deviceSn,
      deviceType: 'INVERTER',
    });
    const points = VOLTAGE_POINTS.filter((key) =>
      response.measurePoints?.includes(key),
    );
    if (!points.length) {
      throw new UnprocessableEntityException(
        'This inverter does not expose grid voltage measurements',
      );
    }
    return points;
  }

  async findInverter(stationId: number) {
    const inverters = new Set<string>();
    for (let page = 1; ; page++) {
      const response = await this.deye.getStationDevices({
        stationIds: [stationId],
        page,
        size: 200,
      });
      const items = response.deviceListItems;
      if (!Array.isArray(items))
        throw new BadGatewayException('Deye returned an invalid device list');
      for (const item of items) {
        if (item.deviceType === 'INVERTER' && item.deviceSn)
          inverters.add(item.deviceSn);
      }
      if (
        items.length < 200 ||
        (response.total !== undefined && page * 200 >= response.total)
      )
        break;
      if (page >= 100)
        throw new BadGatewayException(
          'Deye device pagination exceeded the limit',
        );
    }
    if (!inverters.size)
      throw new NotFoundException('No inverter found for this station');
    if (inverters.size > 1) {
      throw new UnprocessableEntityException(
        'Grid availability is only supported for stations with one inverter',
      );
    }
    return [...inverters][0]!;
  }
}
