export const MISSING_VALUE = '(missing)';

export const OK_VALUE = '(ok)';

export function presentOrMissing(value: string | null): string {
  return value === null || value.length === 0 ? MISSING_VALUE : value;
}
