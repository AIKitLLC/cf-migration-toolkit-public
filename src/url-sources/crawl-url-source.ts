import type { ResponseView } from '../domain/response-view.js';
import { isRedirectStatus } from '../domain/redirect-status.js';
import { isBlockedAddressError } from '../fetcher/blocked-address-error.js';
import { MAX_REDIRECT_HOPS } from '../fetcher/limits.js';
import type { PageReader } from '../http/page-reader.js';
import { sameSite } from '../normalize/same-site.js';
import { sameHostLinks } from './same-host-links.js';
import type { UrlSource } from './url-source.js';

export class CrawlUrlSource implements UrlSource {
  constructor(
    private readonly origin: URL,
    private readonly limit: number,
    private readonly seeds: readonly string[],
    private readonly reader: PageReader,
  ) {}

  async collect(): Promise<readonly string[]> {
    if (this.limit <= 0) return [];
    const queued = new Set<string>();
    const queue: string[] = [];
    const enqueue = (path: string): void => {
      if (queued.has(path)) return;
      queued.add(path);
      queue.push(path);
    };
    const seeds = this.seeds.length > 0 ? this.seeds : ['/'];
    for (const seed of seeds) enqueue(seed);
    const found: string[] = [];
    while (queue.length > 0 && found.length < this.limit) {
      const path = queue.shift();
      if (!path) break;
      const page = await this.readPage(path);
      if (!page) continue;
      found.push(path);
      for (const link of sameHostLinks(page.body, page.url, this.origin)) {
        enqueue(link);
      }
    }
    return found;
  }

  private async readPage(path: string): Promise<ResponseView | null> {
    let current = new URL(path, this.origin);
    try {
      let view = await this.reader.read(current.toString());
      let hops = 0;
      while (hops < MAX_REDIRECT_HOPS && isRedirectStatus(view.status) && view.location) {
        const next = new URL(view.location, current);
        if (!sameSite(next, this.origin)) return view;
        current = next;
        view = await this.reader.read(current.toString());
        hops += 1;
      }
      return view;
    } catch (error) {
      if (isBlockedAddressError(error)) throw error;
      return null;
    }
  }
}
