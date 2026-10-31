import type { VerifyReport } from '../domain/verify-report.js';

export function printSummary(report: VerifyReport): void {
  const { counts, urlCount, source } = report.summary;
  console.error(
    `cfmt verify: ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info(s), ${urlCount} URL(s), source=${source}`,
  );
}
