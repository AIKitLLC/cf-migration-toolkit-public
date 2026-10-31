import type { ResponseView } from './response-view.js';

export interface PageSnapshot {
  requestedUrl: string;
  path: string;
  first: ResponseView;
  final: ResponseView;
  hops: number;
}
