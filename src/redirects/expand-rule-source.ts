import { requestPath } from '../normalize/request-path.js';
import { expandPattern } from './expand-pattern.js';
import type { RedirectRule } from './redirect-rule.js';

export function expandRuleSource(rule: RedirectRule): string {
  const [pathPart, inlineQuery] = splitPathAndQuery(rule.from);
  const expandedPath = expandPattern(pathPart);
  const queryParts = [
    ...(inlineQuery ? [expandPattern(inlineQuery)] : []),
    ...rule.query.map(expandQueryPair),
  ].filter((part) => part.length > 0);
  const path =
    expandedPath.startsWith('/') || expandedPath.includes('://') ? expandedPath : `/${expandedPath}`;
  const joined = queryParts.length === 0 ? path : `${path}?${queryParts.join('&')}`;
  return requestPath(joined);
}

function expandQueryPair(pair: string): string {
  const index = pair.indexOf('=');
  if (index === -1) return expandPattern(pair);
  return `${pair.slice(0, index)}=${expandPattern(pair.slice(index + 1))}`;
}

function splitPathAndQuery(from: string): [string, string | undefined] {
  if (from.includes('://')) {
    const url = new URL(from);
    const query = url.search.startsWith('?') ? url.search.slice(1) : undefined;
    return [`${url.origin}${url.pathname}`, query];
  }
  const index = from.indexOf('?');
  if (index === -1) return [from, undefined];
  return [from.slice(0, index), from.slice(index + 1)];
}
