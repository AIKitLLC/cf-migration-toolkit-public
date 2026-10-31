import { sameSite } from './same-site.js';

export function normalizeLocation(
  location: string,
  baseUrl: string,
  sourceOrigin: URL,
  comparisonOrigin: URL,
): string {
  let absolute: URL;
  try {
    absolute = new URL(location, baseUrl);
  } catch {
    return location.trim();
  }
  if (sameSite(absolute, sourceOrigin)) {
    absolute.protocol = comparisonOrigin.protocol;
    absolute.hostname = comparisonOrigin.hostname;
    absolute.port = comparisonOrigin.port;
  }
  absolute.hash = '';
  if (
    (absolute.protocol === 'http:' && absolute.port === '80') ||
    (absolute.protocol === 'https:' && absolute.port === '443')
  ) {
    absolute.port = '';
  }
  return absolute.toString();
}
