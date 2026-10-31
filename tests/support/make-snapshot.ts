import type { PageSnapshot } from '../../src/domain/page-snapshot.js';
import type { ResponseView } from '../../src/domain/response-view.js';
import type { ComparisonInput } from '../../src/comparators/comparison-input.js';
import { EMPTY_HTML_SIGNALS, type HtmlSignals } from '../../src/html/html-signals.js';
import { DEFAULT_HEADER_ALLOWLIST } from '../../src/headers/default-header-allowlist.js';

export function responseView(partial: {
  url?: string;
  status: number;
  headers?: Record<string, string>;
  location?: string | null;
  body?: string;
}): ResponseView {
  const headers = new Map<string, string>();
  for (const [name, value] of Object.entries(partial.headers ?? {})) {
    headers.set(name.toLowerCase(), value);
  }
  return {
    url: partial.url ?? 'https://old.example/page',
    status: partial.status,
    headers,
    location: partial.location ?? null,
    body: partial.body ?? '',
  };
}

export function pageSnapshot(partial: {
  path?: string;
  first: ResponseView;
  final?: ResponseView;
  hops?: number;
}): PageSnapshot {
  return {
    requestedUrl: partial.first.url,
    path: partial.path ?? '/page',
    first: partial.first,
    final: partial.final ?? partial.first,
    hops: partial.hops ?? (partial.final ? 1 : 0),
  };
}

export function comparison(partial: {
  path?: string;
  oldOrigin?: string;
  newOrigin?: string;
  old: PageSnapshot;
  new: PageSnapshot;
  oldHtml?: HtmlSignals;
  newHtml?: HtmlSignals;
  headers?: readonly string[];
}): ComparisonInput {
  return {
    path: partial.path ?? partial.old.path,
    oldOrigin: new URL(partial.oldOrigin ?? 'https://old.example'),
    newOrigin: new URL(partial.newOrigin ?? 'https://new.example'),
    oldSnapshot: partial.old,
    newSnapshot: partial.new,
    oldHtml: partial.oldHtml ?? EMPTY_HTML_SIGNALS,
    newHtml: partial.newHtml ?? EMPTY_HTML_SIGNALS,
    headers: partial.headers ?? [...DEFAULT_HEADER_ALLOWLIST],
  };
}
