import type { Finding } from '../domain/finding.js';
import type { Comparator } from './comparator.js';
import type { ComparisonInput } from './comparison-input.js';

export function runComparators(comparators: readonly Comparator[], input: ComparisonInput): Finding[] {
  return comparators.flatMap((comparator) => [...comparator.compare(input)]);
}
