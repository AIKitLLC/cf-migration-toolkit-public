import type { Finding } from '../domain/finding.js';
import { MISSING_VALUE } from '../domain/display-values.js';
import { normalizeLocation } from '../normalize/normalize-location.js';
import type { Comparator } from './comparator.js';
import type { ComparisonInput } from './comparison-input.js';

export class RedirectTargetComparator implements Comparator {
  compare(input: ComparisonInput): readonly Finding[] {
    const oldLocation = normalizedSide(
      input.oldSnapshot.first.location,
      input.oldSnapshot.first.url,
      input.oldOrigin,
      input.newOrigin,
    );
    const newLocation = normalizedSide(
      input.newSnapshot.first.location,
      input.newSnapshot.first.url,
      input.newOrigin,
      input.newOrigin,
    );
    if (oldLocation === null && newLocation === null) return [];
    if (oldLocation === newLocation) return [];
    const finding: Finding = {
      path: input.path,
      check: 'redirect-target-changed',
      severity: 'error',
      old: oldLocation ?? MISSING_VALUE,
      new: newLocation ?? MISSING_VALUE,
    };
    return [finding];
  }
}

function normalizedSide(
  location: string | null,
  baseUrl: string,
  sourceOrigin: URL,
  comparisonOrigin: URL,
): string | null {
  if (!location) return null;
  return normalizeLocation(location, baseUrl, sourceOrigin, comparisonOrigin);
}
