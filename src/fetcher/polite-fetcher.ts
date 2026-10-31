import { Agent, buildConnector, fetch as undiciFetch, type Dispatcher } from 'undici';
import type { ResponseView } from '../domain/response-view.js';
import type { PageReader } from '../http/page-reader.js';
import { backoffMs, delay } from './backoff.js';
import { headersToMap } from './headers-to-map.js';
import { createPublicConnector, type AddressResolver } from './public-connect.js';
import { readBodyLimited } from './read-body-limited.js';
import { isRetryableNetworkError } from './retry-policy.js';
import { Semaphore } from './semaphore.js';
import { shouldReadBody } from './should-read-body.js';

export interface PoliteFetcherOptions {
  timeoutMs: number;
  retries: number;
  userAgent: string;
  semaphore: Semaphore;
  guardPublicAddresses?: boolean;
  resolveAddresses?: AddressResolver;
  connect?: ReturnType<typeof buildConnector>;
}

export class PoliteFetcher implements PageReader {
  private dispatcher: Dispatcher | undefined;
  private closed = false;

  constructor(private readonly options: PoliteFetcherOptions) {
    if (options.guardPublicAddresses || options.connect) this.guardLiveConnections();
  }

  guardLiveConnections(): void {
    this.dispatcher ??= new Agent({
      connect: createPublicConnector(this.options.resolveAddresses, this.options.connect),
      connectTimeout: this.options.timeoutMs,
      maxRequestsPerClient: 1,
    });
  }

  async close(): Promise<void> {
    if (this.closed || !this.dispatcher) return;
    this.closed = true;
    await this.dispatcher.close();
  }

  async read(url: string): Promise<ResponseView> {
    return this.options.semaphore.run(() => this.readWithRetries(url));
  }

  private async readWithRetries(url: string): Promise<ResponseView> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.options.retries; attempt += 1) {
      try {
        return await this.readOnce(url);
      } catch (error) {
        lastError = error;
        const exhausted = attempt === this.options.retries;
        if (!isRetryableNetworkError(error) || exhausted) throw error;
        await delay(backoffMs(attempt));
      }
    }
    throw lastError;
  }

  private async readOnce(url: string): Promise<ResponseView> {
    const init = {
      method: 'GET' as const,
      redirect: 'manual' as const,
      headers: {
        'user-agent': this.options.userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(this.options.timeoutMs),
    };
    const response = this.dispatcher
      ? await undiciFetch(url, { ...init, dispatcher: this.dispatcher })
      : await fetch(url, init);
    const headers = headersToMap(response.headers);
    const contentType = response.headers.get('content-type');
    let body = '';
    if (shouldReadBody(response.status, contentType)) {
      body = await readBodyLimited(response as Response);
    } else {
      await response.body?.cancel();
    }
    return {
      url,
      status: response.status,
      headers,
      location: response.headers.get('location'),
      body,
    };
  }
}
