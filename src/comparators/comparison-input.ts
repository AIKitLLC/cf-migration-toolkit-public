import type { PageSnapshot } from '../domain/page-snapshot.js';
import type { HtmlSignals } from '../html/html-signals.js';

export interface ComparisonInput {
  path: string;
  oldOrigin: URL;
  newOrigin: URL;
  oldSnapshot: PageSnapshot;
  newSnapshot: PageSnapshot;
  oldHtml: HtmlSignals;
  newHtml: HtmlSignals;
  headers: readonly string[];
}
