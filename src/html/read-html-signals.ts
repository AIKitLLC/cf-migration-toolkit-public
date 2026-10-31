import { extractAnchorHrefs } from './extract-anchors.js';
import { extractBaseHref } from './extract-base-href.js';
import { extractCanonicalHref } from './extract-canonical.js';
import { extractMetaRobots } from './extract-meta-robots.js';
import { EMPTY_HTML_SIGNALS, type HtmlSignals } from './html-signals.js';
import { parseHtmlDocument } from './parse-html-document.js';

export function readHtmlSignals(html: string): HtmlSignals {
  if (!html.trim()) return EMPTY_HTML_SIGNALS;
  const root = parseHtmlDocument(html);
  return {
    canonicalHref: extractCanonicalHref(root),
    metaRobots: extractMetaRobots(root),
    baseHref: extractBaseHref(root),
    anchorHrefs: extractAnchorHrefs(root),
  };
}
