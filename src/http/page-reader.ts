import type { ResponseView } from '../domain/response-view.js';

export interface PageReader {
  read(url: string): Promise<ResponseView>;
}
