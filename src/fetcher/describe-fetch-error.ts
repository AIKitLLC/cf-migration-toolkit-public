function walk(error: unknown, visit: (record: ErrorRecord) => void): void {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const record = current as ErrorRecord;
    visit(record);
    current = record.cause;
  }
}

interface ErrorRecord {
  name?: unknown;
  code?: unknown;
  message?: unknown;
  cause?: unknown;
}

export function describeFetchError(error: unknown): string {
  let name = '';
  let code = '';
  let message = '';
  walk(error, (record) => {
    if (!name && typeof record.name === 'string') name = record.name;
    if (!code && typeof record.code === 'string') code = record.code;
    if (!message && typeof record.message === 'string') message = record.message;
  });
  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    code === 'ABORT_ERR' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'ETIMEDOUT'
  ) {
    return 'timeout';
  }
  if (code === 'ECONNREFUSED') return 'connection refused';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'host not found';
  if (code === 'ECONNRESET' || code === 'EPIPE' || code === 'UND_ERR_SOCKET') return 'connection reset';
  if (code) return `network error (${code})`;
  if (message) return message.replace(/\s+/g, ' ').slice(0, 160);
  return 'network error';
}
