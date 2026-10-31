import { isBlockedAddressError } from './blocked-address-error.js';

const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
  'ABORT_ERR',
]);

export function isRetryableNetworkError(error: unknown): boolean {
  if (isBlockedAddressError(error)) return false;
  if (!error || typeof error !== 'object') return false;
  const record = error as { name?: unknown; code?: unknown; message?: unknown; cause?: unknown };
  if (record.name === 'TimeoutError' || record.name === 'AbortError') return true;
  if (typeof record.code === 'string' && RETRYABLE_CODES.has(record.code)) return true;
  if (error instanceof TypeError && typeof record.message === 'string' && /fetch failed/i.test(record.message)) {
    return true;
  }
  if (record.cause && record.cause !== error) return isRetryableNetworkError(record.cause);
  return false;
}
