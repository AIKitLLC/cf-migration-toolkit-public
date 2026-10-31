import { createComparators } from '../comparators/create-comparators.js';
import { PoliteFetcher } from '../fetcher/polite-fetcher.js';
import { Semaphore } from '../fetcher/semaphore.js';
import { exitStatusForReport } from '../reporters/exit-status.js';
import { JsonReportRenderer } from '../reporters/json-report-renderer.js';
import { MarkdownReportRenderer } from '../reporters/markdown-report-renderer.js';
import { printSummary } from '../reporters/print-summary.js';
import { renderMarkdownReport } from '../reporters/render-markdown-report.js';
import { ReportFileWriter } from '../reporters/write-report-file.js';
import { ParityVerifier } from '../verify/parity-verifier.js';
import { collectPaths } from './collect-paths.js';
import type { VerifyCliArgs } from './verify-cli-args.js';

export async function executeVerify(args: VerifyCliArgs): Promise<number> {
  const reader = new PoliteFetcher({
    timeoutMs: args.timeoutMs,
    retries: args.retries,
    userAgent: args.userAgent,
    semaphore: new Semaphore(args.concurrency),
    guardPublicAddresses: args.source === 'live',
  });
  try {
    const paths = await collectPaths(args, reader);
    const report = await new ParityVerifier(reader, createComparators()).verify({
      oldOrigin: args.oldOrigin,
      newOrigin: args.newOrigin,
      source: args.source,
      paths,
      headers: args.headers,
      concurrency: args.concurrency,
      timeoutMs: args.timeoutMs,
      retries: args.retries,
      userAgent: args.userAgent,
    });
    if (args.jsonPath) {
      const written = await new ReportFileWriter(new JsonReportRenderer()).write(report, args.jsonPath);
      process.stderr.write(`wrote ${written}\n`);
    }
    if (args.mdPath) {
      const written = await new ReportFileWriter(new MarkdownReportRenderer()).write(report, args.mdPath);
      process.stderr.write(`wrote ${written}\n`);
    }
    if (!args.jsonPath && !args.mdPath) process.stdout.write(renderMarkdownReport(report));
    printSummary(report);
    return exitStatusForReport(report, args.failOnWarn);
  } finally {
    await reader.close();
  }
}
