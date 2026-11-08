import type { DeyeSchemas } from './deye.types.js';

export const GRID_VOLTAGE_THRESHOLD = 10;
export const MAX_SAMPLE_AGE_SECONDS = 600;
export type GridState = 'withGrid' | 'withoutGrid' | 'unknown';
export type GridInterval = { from: number; to: number; state: GridState };

type HistoryRow = DeyeSchemas['DeviceHistoryDataItem'];

export function classifyGridVoltage(
  readings: HistoryRow['itemList'],
  measurePoints: string[],
  requireAllPhases = false,
): GridState {
  const voltages: number[] = [];
  for (const key of measurePoints) {
    const matches = readings?.filter((item) => item.key === key) ?? [];
    if (matches.length !== 1) return 'unknown';
    const point = matches[0]!;
    const value = point.value;
    if (
      (typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'string' && value.trim() === '') ||
      (point.unit !== undefined && point.unit !== 'V')
    )
      return 'unknown';
    const voltage = Number(value);
    if (!Number.isFinite(voltage) || voltage < 0) return 'unknown';
    voltages.push(voltage);
  }
  if (!voltages.length) return 'unknown';
  const hasVoltage = (voltage: number) => voltage > GRID_VOLTAGE_THRESHOLD;
  const hasGrid = requireAllPhases
    ? voltages.every(hasVoltage)
    : voltages.some(hasVoltage);
  return hasGrid ? 'withGrid' : 'withoutGrid';
}

/**
 * Forward-fill each sample until the next sample, for at most ten minutes.
 * Missing/invalid samples and longer telemetry gaps are explicitly unknown.
 * Boundaries are estimates at the telemetry cadence, not exact switch times.
 */
export function calculateGridAvailability(
  rows: HistoryRow[],
  measurePoints: string[],
  from: number,
  to: number,
) {
  const states = new Map<number, GridState>();
  for (const row of rows) {
    if (typeof row.time !== 'string' || !/^\d+$/.test(row.time)) continue;
    const time = Number(row.time);
    if (
      !Number.isSafeInteger(time) ||
      time < from - MAX_SAMPLE_AGE_SECONDS ||
      time >= to
    )
      continue;
    const state = classifyGridVoltage(row.itemList, measurePoints);
    const previous = states.get(time);
    // Overlapping API chunks may repeat a sample. Contradictory duplicates are unknown.
    states.set(
      time,
      previous === undefined || previous === state ? state : 'unknown',
    );
  }
  const samples = [...states].sort(([left], [right]) => left - right);
  const intervals: GridInterval[] = [];
  const append = (start: number, end: number, state: GridState) => {
    if (end <= start) return;
    const last = intervals.at(-1);
    if (last?.state === state && last.to === start) last.to = end;
    else intervals.push({ from: start, to: end, state });
  };
  let cursor = from;
  for (let index = 0; index < samples.length; index++) {
    const [time, state] = samples[index]!;
    const start = Math.max(from, time);
    const end = Math.min(
      to,
      samples[index + 1]?.[0] ?? to,
      time + MAX_SAMPLE_AGE_SECONDS,
    );
    if (start > cursor) append(cursor, start, 'unknown');
    append(start, end, state);
    cursor = Math.max(cursor, start, end);
  }
  append(cursor, to, 'unknown');

  const seconds = { withGrid: 0, withoutGrid: 0, unknown: 0 };
  for (const interval of intervals)
    seconds[interval.state] += interval.to - interval.from;
  const hours = (value: number) => Number((value / 3600).toFixed(6));
  const formatInterval = (interval: GridInterval) => ({
    from: new Date(interval.from * 1000).toISOString(),
    to: new Date(interval.to * 1000).toISOString(),
    seconds: interval.to - interval.from,
    hours: hours(interval.to - interval.from),
  });

  return {
    totalHours: hours(to - from),
    hoursWithoutGrid: hours(seconds.withoutGrid),
    hoursWithGrid: hours(seconds.withGrid),
    hoursWithoutData: hours(seconds.unknown),
    secondsWithoutGrid: seconds.withoutGrid,
    secondsWithGrid: seconds.withGrid,
    secondsWithoutData: seconds.unknown,
    coveragePercent: Number(
      ((1 - seconds.unknown / (to - from)) * 100).toFixed(2),
    ),
    partial: seconds.unknown > 0,
    estimated: true,
    voltageThreshold: GRID_VOLTAGE_THRESHOLD,
    maxSampleAgeSeconds: MAX_SAMPLE_AGE_SECONDS,
    outages: intervals
      .filter((interval) => interval.state === 'withoutGrid')
      .map(formatInterval),
    dataGaps: intervals
      .filter((interval) => interval.state === 'unknown')
      .map(formatInterval),
  };
}
