export class BlockedAddressError extends Error {
  readonly code = 'EBLOCKED_ADDRESS';
  readonly hostname: string;
  readonly address: string;

  constructor(hostname: string, address: string, options?: ErrorOptions) {
    super(`live mode cannot connect to ${hostname} because ${address} is not a global unicast address`, options);
    this.name = 'BlockedAddressError';
    this.hostname = hostname;
    this.address = address;
  }
}

export function isBlockedAddressError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (current instanceof BlockedAddressError) return true;
    const record = current as { code?: unknown; name?: unknown; cause?: unknown };
    if (record.code === 'EBLOCKED_ADDRESS' || record.name === 'BlockedAddressError') return true;
    current = record.cause;
  }
  return false;
}
