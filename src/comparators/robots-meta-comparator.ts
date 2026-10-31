import type { Finding } from '../domain/finding.js';
import { formatHeaderField } from '../headers/format-header-field.js';
import { robotsChangeSeverity } from '../headers/robots-directives.js';
import type { Comparator } from './comparator.js';
import type { ComparisonInput } from './comparison-input.js';

const META_ROBOTS = 'meta-robots';

export class RobotsMetaComparator implements Comparator {
  compare(input: ComparisonInput): readonly Finding[] {
    const oldValue = blankToNull(input.oldHtml.metaRobots);
    const newValue = blankToNull(input.newHtml.metaRobots);
    if (oldValue === null && newValue === null) return [];
    if (oldValue !== null && newValue !== null && tokensEqual(oldValue, newValue)) return [];
    const missing = oldValue === null || newValue === null;
    return [
      {
        path: input.path,
        check: missing ? 'header-missing' : 'header-changed',
        severity: robotsChangeSeverity(oldValue, newValue),
        old: formatHeaderField(META_ROBOTS, oldValue),
        new: formatHeaderField(META_ROBOTS, newValue),
      },
    ];
  }
}

function blankToNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function tokensEqual(left: string, right: string): boolean {
  return normalize(left) === normalize(right);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .sort()
    .join(' ');
}
