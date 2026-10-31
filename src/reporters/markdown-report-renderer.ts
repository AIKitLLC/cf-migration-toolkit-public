import type { VerifyReport } from '../domain/verify-report.js';
import type { ReportRenderer } from './report-renderer.js';
import { renderMarkdownReport } from './render-markdown-report.js';

export class MarkdownReportRenderer implements ReportRenderer {
  render(report: VerifyReport): string {
    return renderMarkdownReport(report);
  }
}
