const HTML = 'text/html';
const UTF8 = 'utf-8';

export interface ContentTypeParts {
  mediaType: string;
  parameters: ReadonlyMap<string, string>;
}

export function isBodylessRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

export function skipContentTypeComparison(oldStatus: number, newStatus: number): boolean {
  return isBodylessRedirect(oldStatus) || isBodylessRedirect(newStatus);
}

export function contentTypesEquivalent(left: string, right: string): boolean {
  const oldParts = parseContentType(left);
  const newParts = parseContentType(right);
  if (!oldParts || !newParts) return false;
  if (oldParts.mediaType !== newParts.mediaType) return false;
  if (parametersEqual(oldParts.parameters, newParts.parameters)) return true;
  return htmlUtf8DefaultMatches(oldParts, newParts);
}

export function parseContentType(value: string): ContentTypeParts | null {
  const segments = value
    .split(';')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const mediaType = segments[0]?.toLowerCase() ?? '';
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mediaType)) return null;
  const parameters = new Map<string, string>();
  for (const segment of segments.slice(1)) {
    const separator = segment.indexOf('=');
    if (separator <= 0) continue;
    const name = segment.slice(0, separator).trim().toLowerCase();
    if (name.length === 0) continue;
    parameters.set(name, unquote(segment.slice(separator + 1).trim()).toLowerCase());
  }
  return { mediaType, parameters };
}

function htmlUtf8DefaultMatches(left: ContentTypeParts, right: ContentTypeParts): boolean {
  if (left.mediaType !== HTML || right.mediaType !== HTML) return false;
  const leftCharset = left.parameters.get('charset') ?? null;
  const rightCharset = right.parameters.get('charset') ?? null;
  if (!isHtmlUtf8Default(leftCharset) || !isHtmlUtf8Default(rightCharset)) return false;
  if (leftCharset === rightCharset) return false;
  return parametersEqual(withoutCharset(left.parameters), withoutCharset(right.parameters));
}

function isHtmlUtf8Default(charset: string | null): boolean {
  return charset === null || charset === UTF8;
}

function withoutCharset(parameters: ReadonlyMap<string, string>): Map<string, string> {
  const copy = new Map(parameters);
  copy.delete('charset');
  return copy;
}

function parametersEqual(left: ReadonlyMap<string, string>, right: ReadonlyMap<string, string>): boolean {
  if (left.size !== right.size) return false;
  for (const [name, value] of left) {
    if (right.get(name) !== value) return false;
  }
  return true;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  return value;
}
