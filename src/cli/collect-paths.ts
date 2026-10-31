import type { PageReader } from '../http/page-reader.js';
import { dedupePaths } from '../normalize/dedupe-paths.js';
import { CompositeUrlSource } from '../url-sources/composite-url-source.js';
import { CrawlUrlSource } from '../url-sources/crawl-url-source.js';
import { FileUrlSource } from '../url-sources/file-url-source.js';
import { RedirectsUrlSource } from '../url-sources/redirects-url-source.js';
import { SitemapUrlSource } from '../url-sources/sitemap-url-source.js';
import type { UrlSource } from '../url-sources/url-source.js';
import type { VerifyCliArgs } from './verify-cli-args.js';

export async function collectPaths(args: VerifyCliArgs, reader: PageReader): Promise<string[]> {
  const sources: UrlSource[] = [];
  if (args.urlFiles.length > 0) sources.push(new FileUrlSource(args.urlFiles));
  if (args.sitemaps.length > 0) sources.push(new SitemapUrlSource(args.sitemaps, reader));
  if (args.redirectFiles.length > 0) sources.push(new RedirectsUrlSource(args.redirectFiles));
  const explicit = sources.length > 0 ? await new CompositeUrlSource(sources).collect() : [];
  const crawled =
    args.crawl === undefined
      ? []
      : await new CrawlUrlSource(
          new URL(args.oldOrigin),
          args.crawl,
          explicit.length > 0 ? explicit : ['/'],
          reader,
        ).collect();
  const paths = dedupePaths([...explicit, ...crawled]);
  if (paths.length === 0) throw new Error('No URLs to verify');
  return paths;
}
