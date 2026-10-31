import type { ConditionKind, MatchCondition } from './migration-document.js';

export function conditionKindForKey(key: string): ConditionKind {
  switch (key.toLowerCase()) {
    case 'country':
      return 'country';
    case 'language':
      return 'language';
    case 'role':
      return 'role';
    case 'cookie':
      return 'cookie';
    default:
      return 'has';
  }
}

export function conditionsFromToken(token: string): MatchCondition {
  const separator = token.indexOf('=');
  if (separator === -1) return { kind: 'has', detail: token };
  const key = token.slice(0, separator);
  const value = token.slice(separator + 1);
  return { kind: conditionKindForKey(key), detail: value || token };
}

export function conditionsFromTable(table: Record<string, string[]>, kindForKey: (key: string) => ConditionKind): MatchCondition[] {
  const conditions: MatchCondition[] = [];
  for (const [key, values] of Object.entries(table)) {
    const kind = kindForKey(key);
    for (const value of values) {
      conditions.push({ kind, detail: `${key}=${value}` });
    }
  }
  return conditions;
}
