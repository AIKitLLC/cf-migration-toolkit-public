import { isRedirectStatus } from '../domain/redirect-status.js';
import { MAX_REDIRECT_HOPS, MAX_SITEMAP_DEPTH } from '../fetcher/limits.js';
import type { PageReader } from '../http/page-reader.js';
import { requestPath } from '../normalize/request-path.js';
import { parseSitemapXml } from './parse-sitemap-xml.js';
import type { UrlSource } from './url-source.js';

export class SitemapUrlSource implements UrlSource {
  constructor(
    private readonly sitemapUrls: readonly string[],
    private readonly reader: PageReader,
  ) {}

  async collect(): Promise<readonly string[]> {
    const paths: string[] = [];
    const seen = new Set<string>();
    for (const sitemapUrl of this.sitemapUrls) {
      paths.push(...(await this.collectDocument(sitemapUrl, 0, seen)));
    }
    return paths;
  }

  private async collectDocument(sitemapUrl: string, depth: number, seen: Set<string>): Promise<string[]> {
    if (depth > MAX_SITEMAP_DEPTH) {
      throw new Error(`Sitemap nesting is deeper than ${MAX_SITEMAP_DEPTH}: ${sitemapUrl}`);
    }
    if (seen.has(sitemapUrl)) return [];
    seen.add(sitemapUrl);
    const body = await this.readXml(sitemapUrl);
    const document = parseSitemapXml(body);
    if (document.kind === 'sitemapindex') {
      const nested: string[] = [];
      for (const loc of document.locs) {
        nested.push(...(await this.collectDocument(loc, depth + 1, seen)));
      }
      return nested;
    }
    return document.locs.map((loc) => requestPath(loc));
  }

  private async readXml(startUrl: string): Promise<string> {
    let url = startUrl;
    let view = await this.reader.read(url);
    let hops = 0;
    while (hops < MAX_REDIRECT_HOPS && isRedirectStatus(view.status) && view.location) {
      url = new URL(view.location, url).toString();
      view = await this.reader.read(url);
      hops += 1;
    }
    if (view.status < 200 || view.status >= 300) {
      throw new Error(`Sitemap request failed with ${view.status} for ${startUrl}`);
    }
    return view.body;
  }
}
