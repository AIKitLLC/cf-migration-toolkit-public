import { isAbsolute, relative } from 'node:path';
import type { ConversionReport } from './conversion-report.js';

export function portablePath(file: string, cwd = process.cwd()): string {
  if (!isAbsolute(file)) return file.replaceAll('\\', '/');
  const rel = relative(cwd, file);
  if (rel.length === 0) return '.';
  if (rel.startsWith('..') || isAbsolute(rel)) return file;
  return rel.replaceAll('\\', '/');
}

export function withPortablePaths(report: ConversionReport, cwd = process.cwd()): ConversionReport {
  return {
    ...report,
    redirects: report.redirects.map((rule) => ({ ...rule, file: portablePath(rule.file, cwd) })),
    unsupported: report.unsupported.map((entry) => ({ ...entry, file: portablePath(entry.file, cwd) })),
    headers: report.headers.map((rule) => ({ ...rule, file: portablePath(rule.file, cwd) })),
  };
}
