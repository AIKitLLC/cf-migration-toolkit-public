import { linkHeaderCanonicals } from '../headers/link-canonical.js';
import { normalizeLocation } from '../normalize/normalize-location.js';

export function normalizedCanonicalSet(
  rawValues: readonly string[],
  baseUrl: string,
  sourceOrigin: URL,
  comparisonOrigin: URL,
): string {
  const normalized = rawValues
    .map((value) => normalizeLocation(value, baseUrl, sourceOrigin, comparisonOrigin))
    .sort();
  return normalized.join(', ');
}

export function linkCanonicals(header: string | null): readonly string[] {
  return linkHeaderCanonicals(header);
}
