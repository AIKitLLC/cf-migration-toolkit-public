import { readHtmlSignals } from '../html/read-html-signals.js';
import { sameSite } from '../normalize/same-site.js';

export function sameHostLinks(html: string, pageUrl: string, origin: URL): string[] {
  const signals = readHtmlSignals(html);
  let base = pageUrl;
  if (signals.baseHref) {
    try {
      base = new URL(signals.baseHref, pageUrl).toString();
    } catch {
      base = pageUrl;
    }
  }
  const paths: string[] = [];
  for (const href of signals.anchorHrefs) {
    if (href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;
    if (!sameSite(resolved, origin)) continue;
    paths.push(resolved.pathname + resolved.search);
  }
  return paths;
}
