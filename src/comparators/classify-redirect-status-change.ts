import { isPermanentRedirect, isRedirectStatus } from '../domain/redirect-status.js';
import type { Severity } from '../domain/severity.js';

export function classifyRedirectStatusChange(oldStatus: number, newStatus: number): Severity | null {
  const oldRedirect = isRedirectStatus(oldStatus);
  const newRedirect = isRedirectStatus(newStatus);
  if (oldRedirect !== newRedirect) return 'error';
  if (!oldRedirect || oldStatus === newStatus) return null;
  if (isPermanentRedirect(oldStatus) && !isPermanentRedirect(newStatus)) return 'error';
  return 'warning';
}
