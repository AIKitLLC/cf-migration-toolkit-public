import type { MatchCondition } from '../redirects/migration-document.js';
import type { UnsupportedReason } from './unsupported-reason.js';

export function reasonsForConditions(conditions: readonly MatchCondition[]): UnsupportedReason[] {
  const reasons: UnsupportedReason[] = [];
  const kinds = new Set(conditions.map((condition) => condition.kind));
  if (kinds.has('role')) reasons.push('role');
  if (kinds.has('cookie')) reasons.push('cookie');
  if (kinds.has('country') || kinds.has('language')) reasons.push('country-or-language');
  if (kinds.has('query')) reasons.push('query-parameters');
  if (kinds.has('has') || kinds.has('missing')) reasons.push('has-or-missing');
  return reasons;
}
