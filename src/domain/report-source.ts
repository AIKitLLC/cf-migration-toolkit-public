export const REPORT_SOURCES = ['fixture', 'live'] as const;

export type ReportSource = (typeof REPORT_SOURCES)[number];

export function isReportSource(value: string): value is ReportSource {
  return (REPORT_SOURCES as readonly string[]).includes(value);
}

export function assertReportSource(value: unknown): ReportSource {
  if (typeof value === 'string' && isReportSource(value)) return value;
  throw new Error('source must be fixture or live');
}
