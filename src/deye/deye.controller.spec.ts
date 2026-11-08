import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeyeController } from './deye.controller.js';
import { DeyeService } from './deye.service.js';
import { DEYE_STATION_ID } from './deye.constants.js';
import { DeyeGridService } from './deye-grid.service.js';

describe('DeyeController', () => {
  const response = { success: true, stationList: [], total: 0 };
  const deye = {
    getStations: vi.fn().mockResolvedValue(response),
    getStationsWithDevices: vi.fn().mockResolvedValue(response),
    getStation: vi
      .fn()
      .mockResolvedValue({ success: true, station: { id: DEYE_STATION_ID } }),
  };
  let controller: DeyeController;
  const grid = {
    getGridOutages: vi.fn().mockResolvedValue({ hoursWithoutGrid: 2 }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DeyeController],
      providers: [
        { provide: DeyeService, useValue: deye },
        { provide: DeyeGridService, useValue: grid },
      ],
    }).compile();
    controller = module.get(DeyeController);
  });

  it('returns the station list and forwards pagination', async () => {
    await expect(controller.getStations(2, 50)).resolves.toEqual(response);
    expect(deye.getStations).toHaveBeenCalledWith({ page: 2, size: 50 });
  });

  it('returns stations with devices through the corresponding service method', async () => {
    await expect(controller.getStationsWithDevices(1, 20)).resolves.toEqual(
      response,
    );
    expect(deye.getStationsWithDevices).toHaveBeenCalledWith({
      page: 1,
      size: 20,
    });
  });

  it('fetches a station by ID', async () => {
    await expect(controller.getStation(123)).resolves.toMatchObject({
      success: true,
    });
    expect(deye.getStation).toHaveBeenCalledWith({ stationId: 123 });
  });

  it('calculates outages for the personal station using the requested period', async () => {
    const from = '2026-10-28T00:00:00Z';
    const to = '2026-10-29T00:00:00Z';
    await expect(controller.getMyGridOutages(from, to)).resolves.toEqual({
      hoursWithoutGrid: 2,
    });
    expect(grid.getGridOutages).toHaveBeenCalledWith(DEYE_STATION_ID, from, to);
    await controller.getGridOutages(123, from, to);
    expect(grid.getGridOutages).toHaveBeenLastCalledWith(123, from, to);
  });

  it('fetches the configured personal station', async () => {
    await expect(controller.getMyStation()).resolves.toMatchObject({
      station: { id: DEYE_STATION_ID },
    });
    expect(deye.getStation).toHaveBeenCalledWith({
      stationId: DEYE_STATION_ID,
    });
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid station ID %s',
    (id) => {
      expect(() => controller.getStation(id)).toThrow(BadRequestException);
      expect(deye.getStation).not.toHaveBeenCalled();
    },
  );

  it.each([
    [0, 20],
    [-1, 20],
    [1.5, 20],
    [1, 0],
    [1, 201],
    [1, 1.5],
  ])(
    'rejects invalid pagination page=%s size=%s before contacting Deye',
    (page, size) => {
      expect(() => controller.getStations(page, size)).toThrow(
        BadRequestException,
      );
      expect(() => controller.getStationsWithDevices(page, size)).toThrow(
        BadRequestException,
      );
      expect(deye.getStations).not.toHaveBeenCalled();
      expect(deye.getStationsWithDevices).not.toHaveBeenCalled();
    },
  );
});
