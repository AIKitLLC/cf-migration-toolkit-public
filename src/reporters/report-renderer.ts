import type { VerifyReport } from '../domain/verify-report.js';

export interface ReportRenderer {
  render(report: VerifyReport): string;
}
