import {
  calculateGridAvailability,
  MAX_SAMPLE_AGE_SECONDS,
} from './grid-availability.js';
import type { DeyeSchemas } from './deye.types.js';

const from = 1792454400;
const points = ['GridVoltageL1', 'GridVoltageL2', 'GridVoltageL3'];
const sample = (
  offset: number,
  voltages = [230, 230, 230],
): DeyeSchemas['DeviceHistoryDataItem'] => ({
  time: String(from + offset),
  itemList: voltages.map((value, index) => ({
    key: points[index],
    value: String(value),
    unit: 'V',
  })),
});

describe('grid availability calculation', () => {
  it('adds consecutive outage intervals and preserves the complete period', () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      sample(index * 300, index < 6 ? [0, 0, 0] : [230, 230, 230]),
    );
    const result = calculateGridAvailability(rows, points, from, from + 3600);
    expect(result).toMatchObject({
      hoursWithoutGrid: 0.5,
      hoursWithGrid: 0.5,
      hoursWithoutData: 0,
      coveragePercent: 100,
      partial: false,
    });
    expect(result.outages).toHaveLength(1);
    expect(result.outages[0]).toMatchObject({ seconds: 1800 });
    expect(
      result.secondsWithoutGrid +
        result.secondsWithGrid +
        result.secondsWithoutData,
    ).toBe(3600);
  });

  it('clips a predecessor sample to the requested start and the last sample to the end', () => {
    const result = calculateGridAvailability(
      [sample(-200, [0, 0, 0]), sample(200)],
      points,
      from,
      from + 400,
    );
    expect(result).toMatchObject({
      secondsWithoutGrid: 200,
      secondsWithGrid: 200,
      secondsWithoutData: 0,
    });
    expect(result.outages[0]!.from).toBe(new Date(from * 1000).toISOString());
  });

  it('limits forward-filled states and marks long gaps and the tail as unknown', () => {
    const result = calculateGridAvailability(
      [sample(0, [0, 0, 0]), sample(1800)],
      points,
      from,
      from + 3600,
    );
    expect(result).toMatchObject({
      secondsWithoutGrid: 600,
      secondsWithGrid: 600,
      secondsWithoutData: 2400,
      partial: true,
    });
    expect(result.dataGaps).toHaveLength(2);
  });

  it('never classifies absent telemetry as an outage', () => {
    const result = calculateGridAvailability([], points, from, from + 3600);
    expect(result).toMatchObject({
      hoursWithoutGrid: 0,
      hoursWithoutData: 1,
      coveragePercent: 0,
      partial: true,
    });
  });

  it('marks a missing leading interval unknown if no predecessor was uploaded', () => {
    const result = calculateGridAvailability(
      [sample(300)],
      points,
      from,
      from + 600,
    );
    expect(result).toMatchObject({
      secondsWithGrid: 300,
      secondsWithoutData: 300,
    });
  });

  it('does not count partial phase loss as a complete grid outage', () => {
    const result = calculateGridAvailability(
      [sample(0, [0, 0, 230])],
      points,
      from,
      from + 300,
    );
    expect(result).toMatchObject({
      secondsWithoutGrid: 0,
      secondsWithGrid: 300,
    });
  });

  it('recognizes near-zero voltage, with an explicit 10 V threshold', () => {
    const result = calculateGridAvailability(
      [sample(0, [0, 1.5, 10])],
      points,
      from,
      from + 300,
    );
    expect(result).toMatchObject({
      secondsWithoutGrid: 300,
      voltageThreshold: 10,
    });
  });

  it.each(['', 'NaN', '-1', null, undefined])(
    'treats invalid voltage %s as unknown',
    (value) => {
      const row = sample(0, [0, 0, 0]);
      row.itemList![0]!.value = value;
      const result = calculateGridAvailability([row], points, from, from + 300);
      expect(result).toMatchObject({
        secondsWithoutGrid: 0,
        secondsWithoutData: 300,
      });
    },
  );

  it('does not infer a complete outage when one configured phase is missing', () => {
    const result = calculateGridAvailability(
      [sample(0, [0, 0])],
      points,
      from,
      from + 300,
    );
    expect(result.secondsWithoutData).toBe(300);
  });

  it('rejects unknown units rather than guessing a voltage conversion', () => {
    const row = sample(0, [0, 0, 0]);
    row.itemList![0]!.unit = 'kV';
    expect(
      calculateGridAvailability([row], points, from, from + 300)
        .secondsWithoutData,
    ).toBe(300);
  });

  it('sorts unordered samples and does not double-count repeated chunk boundaries', () => {
    const rows = [sample(300), sample(0, [0, 0, 0]), sample(300)];
    const result = calculateGridAvailability(rows, points, from, from + 600);
    expect(result).toMatchObject({
      secondsWithoutGrid: 300,
      secondsWithGrid: 300,
      secondsWithoutData: 0,
    });
  });

  it('treats conflicting duplicate samples as unknown', () => {
    const result = calculateGridAvailability(
      [sample(0, [0, 0, 0]), sample(0)],
      points,
      from,
      from + 300,
    );
    expect(result.secondsWithoutData).toBe(300);
  });

  it('does not extrapolate a predecessor older than the configured maximum age', () => {
    const result = calculateGridAvailability(
      [sample(-MAX_SAMPLE_AGE_SECONDS - 1, [0, 0, 0])],
      points,
      from,
      from + 300,
    );
    expect(result.secondsWithoutData).toBe(300);
  });

  it('ignores samples outside the period and malformed timestamps', () => {
    const result = calculateGridAvailability(
      [sample(400), { ...sample(0), time: 'not-a-timestamp' }],
      points,
      from,
      from + 300,
    );
    expect(result.secondsWithoutData).toBe(300);
  });
});
