export function assertOrigin(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Invalid origin: ${input}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Origin must be http or https: ${input}`);
  }
  if (url.username || url.password) {
    throw new Error(`Origin must not include credentials: ${input}`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Origin must not include a path, query, or hash: ${input}`);
  }
  return url.origin;
}
