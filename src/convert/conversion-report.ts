import type { ReportSource } from '../domain/report-source.js';
import type { ConversionDraft } from './conversion-draft.js';

export interface ConversionReport {
  summary: {
    source: ReportSource;
    writtenRedirects: number;
    unsupported: number;
    writtenHeaderRules: number;
    staticRedirects: number;
    dynamicRedirects: number;
    ok: boolean;
  };
  redirects: ConversionDraft['redirects'];
  unsupported: ConversionDraft['unsupported'];
  headers: ConversionDraft['headers'];
  error: string | null;
}

export function buildConversionReport(draft: ConversionDraft, source: ReportSource, error: string | null = null): ConversionReport {
  return {
    summary: {
      source,
      writtenRedirects: draft.redirects.length,
      unsupported: draft.unsupported.length,
      writtenHeaderRules: draft.headers.length,
      staticRedirects: draft.redirects.filter((rule) => !rule.dynamic).length,
      dynamicRedirects: draft.redirects.filter((rule) => rule.dynamic).length,
      ok: error === null,
    },
    redirects: draft.redirects,
    unsupported: draft.unsupported,
    headers: draft.headers,
    error,
  };
}
