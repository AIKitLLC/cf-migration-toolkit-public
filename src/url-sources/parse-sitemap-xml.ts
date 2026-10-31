export type SitemapKind = 'urlset' | 'sitemapindex';

export interface SitemapDocument {
  kind: SitemapKind;
  locs: string[];
}

export function parseSitemapXml(xml: string): SitemapDocument {
  const withoutComments = xml.replace(/<!--[\s\S]*?-->/g, '');
  const kind: SitemapKind = /<sitemapindex\b/i.test(withoutComments) ? 'sitemapindex' : 'urlset';
  const locs: string[] = [];
  const pattern = /<loc\b[^>]*>\s*(?:<!\[CDATA\[)?\s*([^<\s][\s\S]*?)\s*(?:\]\]>)?\s*<\/loc>/gi;
  for (const match of withoutComments.matchAll(pattern)) {
    const value = match[1];
    if (!value) continue;
    locs.push(decodeXmlEntities(value.trim()));
  }
  return { kind, locs };
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}
