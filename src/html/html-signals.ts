export interface HtmlSignals {
  canonicalHref: string | null;
  metaRobots: string | null;
  baseHref: string | null;
  anchorHrefs: readonly string[];
}

export const EMPTY_HTML_SIGNALS: HtmlSignals = {
  canonicalHref: null,
  metaRobots: null,
  baseHref: null,
  anchorHrefs: [],
};
