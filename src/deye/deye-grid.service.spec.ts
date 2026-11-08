import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeyeGridService } from './deye-grid.service.js';
import { DeyeService } from './deye.service.js';
import { DeyeApiError, DeyeConfigurationError } from './deye.errors.js';

const stationId = 61845325;
const from = '2026-10-20T00:00:00Z';
const to = '2026-10-20T01:00:00Z';
const start = Date.parse(from) / 1000;
const points = ['GridVoltageL1', 'GridVoltageL2', 'GridVoltageL3'];

async function setup() {
  const deye = {
    getStationDevices: vi.fn().mockResolvedValue({
      total: 1,
      deviceListItems: [{ deviceSn: 'SN', deviceType: 'INVERTER' }],
    }),
    getDeviceMeasurePoints: vi
      .fn()
      .mockResolvedValue({ measurePoints: points }),
    getDeviceHistoryRaw: vi
      .fn()
      .mockResolvedValue({ deviceSn: 'SN', dataList: [] }),
  };
  const module = await Test.createTestingModule({
    providers: [DeyeGridService, { provide: DeyeService, useValue: deye }],
  }).compile();
  return { service: module.get(DeyeGridService), deye };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('DeyeGridService', () => {
  it('discovers the inverter and computes the requested period from voltage telemetry', async () => {
    const { service, deye } = await setup();
    deye.getDeviceHistoryRaw.mockResolvedValue({
      deviceSn: 'SN',
      dataList: Array.from({ length: 12 }, (_, index) => ({
        time: String(start + index * 300),
        itemList: points.map((key) => ({ key, value: '0', unit: 'V' })),
      })),
    });
    await expect(
      service.getGridOutages(stationId, from, to),
    ).resolves.toMatchObject({
      stationId,
      deviceSn: 'SN',
      hoursWithoutGrid: 1,
      hoursWithGrid: 0,
      hoursWithoutData: 0,
      estimated: true,
    });
    expect(deye.getStationDevices).toHaveBeenCalledWith({
      stationIds: [stationId],
      page: 1,
      size: 200,
    });
    expect(deye.getDeviceHistoryRaw).toHaveBeenCalledWith({
      deviceSn: 'SN',
      deviceType: 'INVERTER',
      startTimestamp: start - 600,
      endTimestamp: start + 3600,
      measurePoints: points,
    });
  });

  it('splits long periods into requests of at most five days including the predecessor window', async () => {
    const { service, deye } = await setup();
    await service.getGridOutages(
      stationId,
      '2026-10-01T00:00:00Z',
      '2026-10-13T00:00:00Z',
    );
    const calls = deye.getDeviceHistoryRaw.mock.calls.map(
      ([request]) =>
        request as { startTimestamp: number; endTimestamp: number },
    );
    expect(calls).toHaveLength(3);
    for (let i = 0; i < calls.length; i++) {
      expect(calls[i]!.endTimestamp - calls[i]!.startTimestamp).toBeLessThan(
        5 * 86400,
      );
      if (i > 0)
        expect(calls[i]!.startTimestamp).toBe(calls[i - 1]!.endTimestamp);
    }
    expect(calls.at(-1)!.endTimestamp).toBe(
      Date.parse('2026-10-13T00:00:00Z') / 1000,
    );
  });

  it('accepts explicit UTC offsets and normalizes timestamps to UTC', async () => {
    const { service } = await setup();
    const result = await service.getGridOutages(
      stationId,
      '2026-10-20T03:00:00+03:00',
      '2026-10-20T04:00:00+03:00',
    );
    expect(result.from).toBe('2026-10-20T00:00:00.000Z');
    expect(result.totalHours).toBe(1);
  });

  it.each([
    [undefined, to],
    ['2026-10-20', to],
    ['2026-10-20T00:00:00', to],
    ['2026-02-30T00:00:00Z', to],
    [from, from],
    [to, from],
    [from, '2026-12-01T00:00:00Z'],
    ['2026-08-01T00:00:00Z', to],
  ])(
    'rejects an invalid period from=%s to=%s without network calls',
    async (left, right) => {
      const { service, deye } = await setup();
      await expect(
        service.getGridOutages(stationId, left, right),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(deye.getStationDevices).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid station IDs before requesting data', async () => {
    const { service, deye } = await setup();
    await expect(service.getGridOutages(-1, from, to)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(deye.getStationDevices).not.toHaveBeenCalled();
  });

  it('reports zero coverage instead of inventing outage hours for empty history', async () => {
    const { service } = await setup();
    await expect(
      service.getGridOutages(stationId, from, to),
    ).resolves.toMatchObject({
      hoursWithoutGrid: 0,
      hoursWithoutData: 1,
      coveragePercent: 0,
      partial: true,
    });
  });

  it('rejects unsupported measurement points', async () => {
    const { service, deye } = await setup();
    deye.getDeviceMeasurePoints.mockResolvedValue({
      measurePoints: ['TotalGridPower'],
    });
    await expect(
      service.getGridOutages(stationId, from, to),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(deye.getDeviceHistoryRaw).not.toHaveBeenCalled();
  });

  it('does not guess which inverter to use when there are several', async () => {
    const { service, deye } = await setup();
    deye.getStationDevices.mockResolvedValue({
      total: 2,
      deviceListItems: [
        { deviceSn: 'A', deviceType: 'INVERTER' },
        { deviceSn: 'B', deviceType: 'INVERTER' },
      ],
    });
    await expect(
      service.getGridOutages(stationId, from, to),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('reports a station without an inverter', async () => {
    const { service, deye } = await setup();
    deye.getStationDevices.mockResolvedValue({ total: 0, deviceListItems: [] });
    await expect(
      service.getGridOutages(stationId, from, to),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects history for the wrong device', async () => {
    const { service, deye } = await setup();
    deye.getDeviceHistoryRaw.mockResolvedValue({
      deviceSn: 'WRONG',
      dataList: [],
    });
    await expect(
      service.getGridOutages(stationId, from, to),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('turns Deye errors into sanitized HTTP errors', async () => {
    const { service, deye } = await setup();
    deye.getStationDevices.mockRejectedValueOnce(
      new DeyeApiError('api', '/v1.0/station/device', undefined, '123', 'req'),
    );
    await expect(
      service.getGridOutages(stationId, from, to),
    ).rejects.toBeInstanceOf(BadGatewayException);
    deye.getStationDevices.mockRejectedValueOnce(
      new DeyeConfigurationError('DEYE_APP_SECRET'),
    );
    await expect(
      service.getGridOutages(stationId, from, to),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
