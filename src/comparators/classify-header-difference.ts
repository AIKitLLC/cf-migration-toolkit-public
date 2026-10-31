import type { CheckId } from '../domain/check-id.js';
import type { Severity } from '../domain/severity.js';
import { contentTypesEquivalent, skipContentTypeComparison } from '../headers/content-type-comparison.js';
import { isHardeningHeader } from '../headers/hardening-headers.js';
import { headerValuesEqual } from '../headers/normalize-header-value.js';
import { robotsChangeSeverity } from '../headers/robots-directives.js';

export interface HeaderSides {
  name: string;
  oldValue: string | null;
  newValue: string | null;
  oldStatus: number;
  newStatus: number;
}

export interface HeaderDifference {
  check: CheckId;
  severity: Severity;
}

export function classifyHeaderDifference(sides: HeaderSides): HeaderDifference | null {
  const name = sides.name.toLowerCase();
  if (name === 'content-type' && skipContentTypeComparison(sides.oldStatus, sides.newStatus)) return null;
  const { oldValue, newValue } = sides;
  if (oldValue === null && newValue === null) return null;
  if (oldValue !== null && newValue !== null && sameHeaderValue(name, oldValue, newValue)) return null;
  if (oldValue === null && newValue !== null && isHardeningHeader(name)) {
    return { check: 'header-added', severity: 'info' };
  }
  const severity = name === 'x-robots-tag' ? robotsChangeSeverity(oldValue, newValue) : 'warning';
  if (oldValue === null || newValue === null) return { check: 'header-missing', severity };
  return { check: 'header-changed', severity };
}

function sameHeaderValue(name: string, oldValue: string, newValue: string): boolean {
  if (headerValuesEqual(name, oldValue, newValue)) return true;
  return name === 'content-type' && contentTypesEquivalent(oldValue, newValue);
}
