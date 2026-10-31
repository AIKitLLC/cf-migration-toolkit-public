import type { ReportSource } from '../domain/report-source.js';

export interface VerifyCliArgs {
  oldOrigin: string;
  newOrigin: string;
  source: ReportSource;
  urlFiles: readonly string[];
  sitemaps: readonly string[];
  redirectFiles: readonly string[];
  crawl: number | undefined;
  headers: readonly string[];
  jsonPath: string | undefined;
  mdPath: string | undefined;
  concurrency: number;
  timeoutMs: number;
  retries: number;
  userAgent: string;
  failOnWarn: boolean;
}
