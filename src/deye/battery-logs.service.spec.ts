import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BatteryLogsService } from './battery-logs.service.js';
import { DeyeService, type DeyeWebBatteryDetail } from './deye.service.js';

function detail(deviceSn = 'BAT-A', deviceId = 1): DeyeWebBatteryDetail {
  return {
    deviceSn,
    deviceId,
    siteId: 61845325,
    type: 'BATTERY',
    collectionTime: Math.floor(Date.now() / 1000),
    deviceState: 1,
    connectStatus: 1,
    paramCategoryList: [
      { fieldList: [{ storageName: 'BSC', value: '99.70', unit: '%' }] },
      {
        fieldList: [
          { storageName: 'MAX_C_V', value: '3.35', unit: 'V' },
          { storageName: 'MIN_C_V', value: '3.34', unit: 'V' },
        ],
      },
    ],
  };
}
async function setup(serials = ['BAT-A', 'BAT-B']) {
  const deye = {
    getStationDevices: vi.fn().mockResolvedValue({
      total: serials.length + 1,
      deviceListItems: [
        ...serials.map((deviceSn, index) => ({
          deviceSn,
          deviceId: index + 1,
          deviceType: 'BATTERY',
        })),
        { deviceSn: 'INVERTER', deviceId: 100, deviceType: 'INVERTER' },
      ],
    }),
    getBatteryWebDetail: vi
      .fn()
      .mockImplementation(async (id: number) => detail(serials[id - 1], id)),
  };
  const module = await Test.createTestingModule({
    providers: [BatteryLogsService, { provide: DeyeService, useValue: deye }],
  }).compile();
  const logs = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  const warnings = vi
    .spyOn(Logger.prototype, 'warn')
    .mockImplementation(() => {});
  return { service: module.get(BatteryLogsService), deye, logs, warnings };
}
afterEach(() => vi.restoreAllMocks());

describe('battery web data logs', () => {
  it('logs verified web fields for each battery by numeric ID', async () => {
    const { service, deye, logs } = await setup();
    const second = detail('BAT-B', 2);
    second.paramCategoryList[0]!.fieldList![0]!.value = '75';
    deye.getBatteryWebDetail
      .mockResolvedValueOnce(detail())
      .mockResolvedValueOnce(second);
    await service.logForStation(61845325);
    expect(deye.getBatteryWebDetail.mock.calls).toEqual([[1], [2]]);
    expect(logs).toHaveBeenCalledWith(
      expect.stringContaining(
        'Батарея BAT-A | станция 61845325 | max cell V: 3.35 V | min cell V: 3.34 V | SOC: 99.7 %',
      ),
    );
    expect(logs).toHaveBeenCalledWith(expect.stringContaining('Батарея BAT-B'));
    expect(logs).toHaveBeenCalledWith(expect.stringContaining('SOC: 75 %'));
    expect(
      logs.mock.calls.every(([line]) =>
        String(line).endsWith('данные: актуальные'),
      ),
    ).toBe(true);
  });
  it('accepts numeric zero SOC and converts millivolts', async () => {
    const { service, deye, logs } = await setup(['BAT-A']);
    const battery = detail();
    battery.paramCategoryList = [
      {
        fieldList: [
          { storageName: 'MAX_C_V', value: 3400, unit: 'mV' },
          { storageName: 'MIN_C_V', value: 3.3, unit: 'V' },
          { storageName: 'BSC', value: 0, unit: '%' },
        ],
      },
    ];
    deye.getBatteryWebDetail.mockResolvedValue(battery);
    await service.logForStation(61845325);
    expect(logs).toHaveBeenCalledWith(
      expect.stringContaining(
        'max cell V: 3.4 V | min cell V: 3.3 V | SOC: 0 %',
      ),
    );
  });
  it('does not substitute pack voltage or null telemetry for cell readings', async () => {
    const { service, deye, logs, warnings } = await setup(['BAT-A']);
    const battery = detail();
    battery.paramCategoryList = [
      {
        fieldList: [
          { storageName: 'BV', value: '53.50', unit: 'V' },
          { storageName: 'BSC', value: '101', unit: '%' },
          { storageName: 'MAX_C_V', value: null, unit: 'V' },
        ],
      },
    ];
    deye.getBatteryWebDetail.mockResolvedValue(battery);
    await service.logForStation(61845325);
    await service.logForStation(61845325);
    expect(logs).toHaveBeenCalledWith(
      expect.stringContaining(
        'max cell V: нет данных | min cell V: нет данных | SOC: нет данных',
      ),
    );
    expect(warnings).toHaveBeenCalledTimes(1);
  });
  it.each(['old', 'offline'] as const)(
    'marks %s data as unavailable',
    async (state) => {
      const { service, deye, logs } = await setup(['BAT-A']);
      const battery = detail();
      if (state === 'old') battery.collectionTime! -= 3600;
      else battery.connectStatus = 0;
      deye.getBatteryWebDetail.mockResolvedValue(battery);
      await service.logForStation(61845325);
      expect(logs).toHaveBeenCalledWith(
        expect.stringContaining('устарели или недоступны'),
      );
    },
  );
  it('isolates battery errors without logging upstream error contents', async () => {
    const { service, deye, logs, warnings } = await setup();
    deye.getBatteryWebDetail.mockRejectedValueOnce(new Error('secret-token'));
    await service.logForStation(61845325);
    expect(deye.getBatteryWebDetail).toHaveBeenCalledTimes(2);
    expect(logs).toHaveBeenCalledTimes(1);
    expect(logs).toHaveBeenCalledWith(expect.stringContaining('Батарея BAT-B'));
    expect(warnings).toHaveBeenCalledWith(
      expect.stringContaining('Не удалось прочитать батарею BAT-A'),
    );
    expect(JSON.stringify(warnings.mock.calls)).not.toContain('secret-token');
  });
  it.each([{ deviceSn: 'OTHER' }, { siteId: 123 }])(
    'rejects telemetry for another device/station: %j',
    async (overrides) => {
      const { service, deye, logs, warnings } = await setup(['BAT-A']);
      deye.getBatteryWebDetail.mockResolvedValue({ ...detail(), ...overrides });
      await service.logForStation(61845325);
      expect(logs).not.toHaveBeenCalled();
      expect(warnings).toHaveBeenCalledWith(
        expect.stringContaining('Не удалось прочитать батарею'),
      );
    },
  );
  it('does not guess missing device IDs from serial numbers', async () => {
    const { service, deye, warnings } = await setup(['BAT-A']);
    deye.getStationDevices.mockResolvedValue({
      deviceListItems: [{ deviceSn: 'BAT-A', deviceType: 'BATTERY' }],
    });
    await service.logForStation(61845325);
    expect(deye.getBatteryWebDetail).not.toHaveBeenCalled();
    expect(warnings).toHaveBeenCalledWith(
      expect.stringContaining('отсутствует числовой deviceId'),
    );
  });
  it('handles an empty battery list without requesting data', async () => {
    const { service, deye, warnings } = await setup([]);
    await service.logForStation(61845325);
    expect(deye.getBatteryWebDetail).not.toHaveBeenCalled();
    expect(warnings).toHaveBeenCalledWith(
      expect.stringContaining('не найдены'),
    );
  });
});
