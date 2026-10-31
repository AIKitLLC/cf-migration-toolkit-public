import { CloudflareLimitError, DYNAMIC_REDIRECT_LIMIT, HEADER_LINE_CHAR_LIMIT, HEADER_RULE_LIMIT, REDIRECT_RULE_CHAR_LIMIT, STATIC_REDIRECT_LIMIT } from './cloudflare-limits.js';
import type { ConversionDraft } from './conversion-draft.js';
import { renderHeadersFile } from './render-headers-file.js';

export function assertCloudflareLimits(draft: ConversionDraft): void {
  const staticCount = draft.redirects.filter((rule) => !rule.dynamic).length;
  const dynamicCount = draft.redirects.filter((rule) => rule.dynamic).length;
  if (staticCount > STATIC_REDIRECT_LIMIT) {
    throw new CloudflareLimitError(
      `Cloudflare _redirects allows ${STATIC_REDIRECT_LIMIT} static redirects and this conversion produced ${staticCount}. Use Bulk Redirects for the rules that do not fit in _redirects.`,
    );
  }
  if (dynamicCount > DYNAMIC_REDIRECT_LIMIT) {
    throw new CloudflareLimitError(
      `Cloudflare _redirects allows ${DYNAMIC_REDIRECT_LIMIT} dynamic redirects and this conversion produced ${dynamicCount}. Use Bulk Redirects for the rules that do not fit in _redirects.`,
    );
  }
  for (const rule of draft.redirects) {
    if (rule.output.length > REDIRECT_RULE_CHAR_LIMIT) {
      throw new CloudflareLimitError(
        `Cloudflare _redirects allows ${REDIRECT_RULE_CHAR_LIMIT} characters per rule and this rule has ${rule.output.length}. Use Bulk Redirects for rules that do not fit in _redirects.`,
      );
    }
  }
  if (draft.headers.length > HEADER_RULE_LIMIT) {
    throw new CloudflareLimitError(
      `Cloudflare _headers allows ${HEADER_RULE_LIMIT} rules and this conversion produced ${draft.headers.length}. Use Bulk Redirects for redirect overflow, and a Worker for header rules that do not fit in _headers.`,
    );
  }
  if (draft.headers.length === 0) return;
  for (const line of renderHeadersFile(draft.headers).split('\n')) {
    if (line.length > HEADER_LINE_CHAR_LIMIT) {
      throw new CloudflareLimitError(
        `Cloudflare _headers allows ${HEADER_LINE_CHAR_LIMIT} characters per line and this line has ${line.length}. Use Bulk Redirects for redirect overflow, and a Worker for header lines that do not fit in _headers.`,
      );
    }
  }
}
