import type { UrlSource } from './url-source.js';

export class CompositeUrlSource implements UrlSource {
  constructor(private readonly sources: readonly UrlSource[]) {}

  async collect(): Promise<readonly string[]> {
    const groups = await Promise.all(this.sources.map((source) => source.collect()));
    return groups.flat();
  }
}
