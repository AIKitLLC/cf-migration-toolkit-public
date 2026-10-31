export function headersToMap(headers: Headers): Map<string, string> {
  const map = new Map<string, string>();
  headers.forEach((value, key) => {
    map.set(key.toLowerCase(), value);
  });
  return map;
}
