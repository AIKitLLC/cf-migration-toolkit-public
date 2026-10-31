export function requestPath(input: string): string {
  if (input.startsWith('/')) {
    const url = new URL(input, 'http://paths.invalid');
    return url.pathname + url.search;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Not a path or absolute URL: ${input}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported URL: ${input}`);
  }
  return url.pathname + url.search;
}
