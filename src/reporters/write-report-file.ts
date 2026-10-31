import type { VerifyReport } from '../domain/verify-report.js';
import { writeAtomic } from './atomic-write.js';
import { timestampedEvidencePath } from './evidence-path.js';
import type { ReportRenderer } from './report-renderer.js';

export class ReportFileWriter {
  constructor(private readonly renderer: ReportRenderer) {}

  async write(report: VerifyReport, filePath: string, now = new Date()): Promise<string> {
    const destination = timestampedEvidencePath(filePath, now);
    await writeAtomic(destination, this.renderer.render(report));
    return destination;
  }
}
