import { buildReport } from '../domain/build-report.js';
import { assertReportSource } from '../domain/report-source.js';
import { OK_VALUE } from '../domain/display-values.js';
import type { Finding } from '../domain/finding.js';
import type { PageSnapshot } from '../domain/page-snapshot.js';
import { isBlockedAddressError } from '../fetcher/blocked-address-error.js';
import { describeFetchError } from '../fetcher/describe-fetch-error.js';
import { snapshotPage } from '../fetcher/snapshot-page.js';
import { readHtmlSignals } from '../html/read-html-signals.js';
import type { PageReader } from '../http/page-reader.js';
import type { Comparator } from '../comparators/comparator.js';
import type { ComparisonInput } from '../comparators/comparison-input.js';
import { runComparators } from '../comparators/run-comparators.js';
import type { VerifyReport } from '../domain/verify-report.js';
import type { VerifyOptions } from './verify-options.js';

type Capture = { ok: true; snapshot: PageSnapshot } | { ok: false; message: string };

function guardLiveReader(reader: PageReader): void {
  const candidate = reader as PageReader & { guardLiveConnections?: unknown };
  if (typeof candidate.guardLiveConnections !== 'function') {
    throw new Error('live mode requires a page reader that guards connections');
  }
  candidate.guardLiveConnections();
}

export class ParityVerifier {
  constructor(
    private readonly reader: PageReader,
    private readonly comparators: readonly Comparator[],
  ) {}

  async verify(options: VerifyOptions): Promise<VerifyReport> {
    assertReportSource(options.source);
    if (options.source === 'live') guardLiveReader(this.reader);
    const groups = await Promise.all(options.paths.map((path) => this.verifyPath(path, options)));
    return buildReport({
      source: options.source,
      oldOrigin: options.oldOrigin,
      newOrigin: options.newOrigin,
      urlCount: options.paths.length,
      findings: groups.flat(),
    });
  }

  private async verifyPath(path: string, options: VerifyOptions): Promise<Finding[]> {
    const oldOrigin = new URL(options.oldOrigin);
    const newOrigin = new URL(options.newOrigin);
    const [oldResult, newResult] = await Promise.all([
      this.capture(oldOrigin, path),
      this.capture(newOrigin, path),
    ]);
    if (!oldResult.ok || !newResult.ok) {
      return [
        {
          path,
          check: 'fetch-failed',
          severity: 'error',
          old: oldResult.ok ? OK_VALUE : oldResult.message,
          new: newResult.ok ? OK_VALUE : newResult.message,
        },
      ];
    }
    const input: ComparisonInput = {
      path,
      oldOrigin,
      newOrigin,
      oldSnapshot: oldResult.snapshot,
      newSnapshot: newResult.snapshot,
      oldHtml: readHtmlSignals(oldResult.snapshot.final.body),
      newHtml: readHtmlSignals(newResult.snapshot.final.body),
      headers: options.headers,
    };
    return runComparators(this.comparators, input);
  }

  private async capture(origin: URL, path: string): Promise<Capture> {
    try {
      return { ok: true, snapshot: await snapshotPage(this.reader, origin, path) };
    } catch (error) {
      if (isBlockedAddressError(error)) throw error;
      return { ok: false, message: describeFetchError(error) };
    }
  }
}
