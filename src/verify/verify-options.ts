import type { ReportSource } from '../domain/report-source.js';

export interface VerifyOptions {
  oldOrigin: string;
  newOrigin: string;
  source: ReportSource;
  paths: readonly string[];
  headers: readonly string[];
  concurrency: number;
  timeoutMs: number;
  retries: number;
  userAgent: string;
}
