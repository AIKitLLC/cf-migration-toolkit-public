import type { ResponseView } from '../../src/domain/response-view.js';
import type { PageReader } from '../../src/http/page-reader.js';

export class MapReader implements PageReader {
  readonly urls: string[] = [];

  constructor(private readonly pages: Readonly<Record<string, ResponseView | Error>>) {}

  async read(url: string): Promise<ResponseView> {
    this.urls.push(url);
    const page = this.pages[url];
    if (!page) throw Object.assign(new Error(`missing ${url}`), { code: 'ECONNREFUSED' });
    if (page instanceof Error) throw page;
    return page;
  }
}
