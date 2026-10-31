import { SAMPLE_SEGMENT } from './sample-segment.js';

const PLACEHOLDER = /:([A-Za-z_][A-Za-z0-9_]*)/g;

export function expandPattern(value: string): string {
  return value.replaceAll('*', SAMPLE_SEGMENT).replace(PLACEHOLDER, SAMPLE_SEGMENT);
}
