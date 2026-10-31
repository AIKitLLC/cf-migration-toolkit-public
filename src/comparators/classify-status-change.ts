import type { Severity } from '../domain/severity.js';

export function classifyStatusChange(oldStatus: number, newStatus: number): Severity | null {
  if (oldStatus === newStatus) return null;
  if (oldStatus === 200 && newStatus >= 400) return 'error';
  return 'warning';
}
