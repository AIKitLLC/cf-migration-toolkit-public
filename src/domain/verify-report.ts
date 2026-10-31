import type { CheckId } from './check-id.js';
import type { Finding } from './finding.js';
import type { ReportSource } from './report-source.js';

export interface ReportCounts {
  error: number;
  warning: number;
  info: number;
}

export interface ReportSummary {
  source: ReportSource;
  evidence?: 'E2';
  oldOrigin: string;
  newOrigin: string;
  urlCount: number;
  counts: ReportCounts;
  byCheck: Partial<Record<CheckId, number>>;
}

export interface VerifyReport {
  summary: ReportSummary;
  findings: Finding[];
}
