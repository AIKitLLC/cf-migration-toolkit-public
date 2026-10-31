import { presentOrMissing } from '../domain/display-values.js';

export function formatHeaderField(name: string, value: string | null): string {
  return `${name}: ${presentOrMissing(value)}`;
}
