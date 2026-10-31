import type { Comparator } from './comparator.js';
import { CanonicalComparator } from './canonical-comparator.js';
import { HeaderComparator } from './header-comparator.js';
import { RedirectStatusComparator } from './redirect-status-comparator.js';
import { RedirectTargetComparator } from './redirect-target-comparator.js';
import { RobotsMetaComparator } from './robots-meta-comparator.js';
import { StatusComparator } from './status-comparator.js';

export function createComparators(): readonly Comparator[] {
  return [
    new StatusComparator(),
    new RedirectStatusComparator(),
    new RedirectTargetComparator(),
    new HeaderComparator(),
    new CanonicalComparator(),
    new RobotsMetaComparator(),
  ];
}
