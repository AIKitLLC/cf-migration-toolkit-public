import type { Finding } from '../domain/finding.js';
import type { ComparisonInput } from './comparison-input.js';

export interface Comparator {
  compare(input: ComparisonInput): readonly Finding[];
}
