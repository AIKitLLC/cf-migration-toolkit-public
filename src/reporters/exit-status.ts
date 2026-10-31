import type { VerifyReport } from '../domain/verify-report.js';

export function exitStatusForReport(report: VerifyReport, failOnWarn: boolean): number {
  if (report.summary.counts.error > 0) return 1;
  if (failOnWarn && report.summary.counts.warning > 0) return 1;
  return 0;
}
