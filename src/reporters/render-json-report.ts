import type { VerifyReport } from '../domain/verify-report.js';

export function renderJsonReport(report: VerifyReport): string {
  const body = {
    summary: {
      source: report.summary.source,
      ...(report.summary.evidence ? { evidence: report.summary.evidence } : {}),
      oldOrigin: report.summary.oldOrigin,
      newOrigin: report.summary.newOrigin,
      urlCount: report.summary.urlCount,
      counts: {
        error: report.summary.counts.error,
        warning: report.summary.counts.warning,
        info: report.summary.counts.info,
      },
      byCheck: report.summary.byCheck,
    },
    findings: report.findings,
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}
