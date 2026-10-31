import type { VerifyReport } from '../domain/verify-report.js';
import type { ReportRenderer } from './report-renderer.js';
import { renderJsonReport } from './render-json-report.js';

export class JsonReportRenderer implements ReportRenderer {
  render(report: VerifyReport): string {
    return renderJsonReport(report);
  }
}
