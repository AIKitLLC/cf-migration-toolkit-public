import { CHECK_IDS } from './check-id.js';
import { compareFindings } from './compare-findings.js';
import type { Finding } from './finding.js';
import { assertReportSource, type ReportSource } from './report-source.js';
import type { VerifyReport } from './verify-report.js';

export interface BuildReportInput {
  source: ReportSource;
  oldOrigin: string;
  newOrigin: string;
  urlCount: number;
  findings: readonly Finding[];
}

export function buildReport(input: BuildReportInput): VerifyReport {
  const source = assertReportSource(input.source);
  const findings = [...input.findings].sort(compareFindings);
  const counts = { error: 0, warning: 0, info: 0 };
  const tallies = new Map<string, number>();
  for (const finding of findings) {
    counts[finding.severity] += 1;
    tallies.set(finding.check, (tallies.get(finding.check) ?? 0) + 1);
  }
  const byCheck: VerifyReport['summary']['byCheck'] = {};
  for (const check of CHECK_IDS) {
    const count = tallies.get(check);
    if (count) byCheck[check] = count;
  }
  return {
    summary: {
      source,
      ...(source === 'live' ? { evidence: 'E2' as const } : {}),
      oldOrigin: input.oldOrigin,
      newOrigin: input.newOrigin,
      urlCount: input.urlCount,
      counts,
      byCheck,
    },
    findings,
  };
}
