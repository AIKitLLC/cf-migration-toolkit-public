import type { ReportSource } from '../domain/report-source.js';

export interface ConvertCliArgs {
  inputs: string[];
  outDir: string;
  source: ReportSource;
  jsonPath?: string;
  mdPath?: string;
}
