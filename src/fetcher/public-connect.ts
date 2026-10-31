import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { buildConnector } from 'undici';
import { isGlobalUnicast } from '../normalize/global-unicast.js';
import { BlockedAddressError } from './blocked-address-error.js';

export interface ResolvedAddress {
  address: string;
  family?: number;
}

export type AddressResolver = (hostname: string) => Promise<readonly ResolvedAddress[]>;

export function bareHostname(hostname: string): string {
  if (hostname.startsWith('[') && hostname.endsWith(']')) return hostname.slice(1, -1);
  return hostname;
}

export async function dnsResolveAll(hostname: string): Promise<readonly ResolvedAddress[]> {
  const bare = bareHostname(hostname);
  const family = isIP(bare);
  if (family !== 0) return [{ address: bare, family }];
  return lookup(bare, { all: true, verbatim: true });
}

export async function selectPublicAddress(hostname: string, resolve: AddressResolver = dnsResolveAll): Promise<string> {
  const bare = bareHostname(hostname);
  const addresses = await resolve(bare);
  if (addresses.length === 0) throw new BlockedAddressError(bare, 'unresolved');
  for (const row of addresses) {
    if (!isGlobalUnicast(row.address)) throw new BlockedAddressError(bare, row.address);
  }
  const selected = addresses[0];
  if (!selected) throw new BlockedAddressError(bare, 'unresolved');
  return selected.address;
}

export function createPublicConnector(
  resolve: AddressResolver = dnsResolveAll,
  inner: buildConnector.connector = buildConnector({}),
): buildConnector.connector {
  return (options, callback) => {
    const original = bareHostname(options.hostname);
    void selectPublicAddress(original, resolve).then(
      (address) => {
        const servername = options.servername ?? (isIP(original) ? undefined : original);
        inner({ ...options, hostname: address, servername }, callback);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), null);
      },
    );
  };
}
