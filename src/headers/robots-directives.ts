import type { Severity } from '../domain/severity.js';

export function robotTokens(value: string | null): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .toLowerCase()
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0),
  );
}

export function impliesNoindex(value: string | null): boolean {
  const tokens = robotTokens(value);
  return tokens.has('noindex') || tokens.has('none');
}

export function robotsChangeSeverity(oldValue: string | null, newValue: string | null): Severity {
  if (impliesNoindex(oldValue) || impliesNoindex(newValue)) return 'error';
  return 'warning';
}
