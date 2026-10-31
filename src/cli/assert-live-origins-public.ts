import { BlockedAddressError } from '../fetcher/blocked-address-error.js';
import { bareHostname, dnsResolveAll, selectPublicAddress, type AddressResolver } from '../fetcher/public-connect.js';

export async function assertLiveOriginsArePublic(
  oldOrigin: string,
  newOrigin: string,
  resolve: AddressResolver = dnsResolveAll,
): Promise<void> {
  await assertPublicOrigin(oldOrigin, resolve);
  await assertPublicOrigin(newOrigin, resolve);
}

async function assertPublicOrigin(origin: string, resolve: AddressResolver): Promise<void> {
  const hostname = bareHostname(new URL(origin).hostname);
  try {
    await selectPublicAddress(hostname, resolve);
  } catch (error) {
    if (error instanceof BlockedAddressError) {
      throw new Error(
        `--source live cannot use ${origin} because ${error.hostname} resolves to ${error.address}, which is not a global unicast address`,
        { cause: error },
      );
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`--source live cannot use ${origin} because ${hostname} did not resolve: ${detail}`, {
      cause: error,
    });
  }
}
