import { isRedirectStatus } from '../domain/redirect-status.js';
import type { PageSnapshot } from '../domain/page-snapshot.js';
import type { PageReader } from '../http/page-reader.js';
import { MAX_REDIRECT_HOPS } from './limits.js';

export async function snapshotPage(reader: PageReader, origin: URL, path: string): Promise<PageSnapshot> {
  const requested = new URL(path, origin);
  const first = await reader.read(requested.toString());
  let finalResponse = first;
  let hops = 0;
  let currentUrl = requested;
  while (hops < MAX_REDIRECT_HOPS && isRedirectStatus(finalResponse.status) && finalResponse.location) {
    currentUrl = new URL(finalResponse.location, currentUrl);
    finalResponse = await reader.read(currentUrl.toString());
    hops += 1;
  }
  return {
    requestedUrl: requested.toString(),
    path,
    first,
    final: finalResponse,
    hops,
  };
}
