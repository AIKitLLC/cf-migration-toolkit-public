import type { ConversionReport } from './conversion-report.js';
import { withPortablePaths } from './portable-path.js';

export function renderConversionJson(report: ConversionReport, cwd = process.cwd()): string {
  return `${JSON.stringify(withPortablePaths(report, cwd), null, 2)}\n`;
}
