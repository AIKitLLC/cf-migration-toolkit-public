import type { MigrationRedirect } from '../redirects/migration-document.js';
import { REDIRECT_STATUSES } from './cloudflare-limits.js';
import { reasonsForConditions } from './condition-reasons.js';
import type { UnsupportedEntry, WrittenRedirect } from './conversion-draft.js';
import { isDomainLevelSource, isRelativeDestination, sourcePath } from './path-shape.js';
import { resolveRedirectStatus } from './resolve-redirect-status.js';
import { renderRedirectLine } from './render-redirect-line.js';
import { shadowingCaveat } from './shadowing-caveat.js';
import { isDynamicPattern, translateEndpoint } from './translate-pattern.js';
import { chooseAlternative, messageForReasons } from './unsupported-reason.js';
import type { UnsupportedReason } from './unsupported-reason.js';

export type ClassifiedRedirect =
  | { kind: 'written'; rule: WrittenRedirect }
  | { kind: 'unsupported'; entry: UnsupportedEntry };

export function classifyRedirect(rule: MigrationRedirect): ClassifiedRedirect {
  const reasons: UnsupportedReason[] = [];
  if (!rule.to) reasons.push('missing-target');
  if (rule.signed) reasons.push('signed-proxy');
  if (rule.proxyRequestHeaders) reasons.push('proxy-request-headers');
  if (rule.from && isDomainLevelSource(rule.from)) reasons.push('domain-level');
  reasons.push(...reasonsForConditions(rule.conditions));

  const source = translateEndpoint(sourcePath(rule.from), 'source', rule.platform);
  const destination = rule.to ? translateEndpoint(rule.to, 'destination', rule.platform) : { ok: false as const };
  if (!source.ok || !destination.ok) reasons.push('pattern');

  const resolved = resolveRedirectStatus(rule);
  if (resolved.status === 200) {
    if (!rule.to || !isRelativeDestination(rule.to)) reasons.push('external-proxy');
  } else if (!REDIRECT_STATUSES.has(resolved.status)) {
    reasons.push('unsupported-status');
  }

  const unique = dedupe(reasons);
  if (unique.length > 0 || !source.ok || !destination.ok) {
    return { kind: 'unsupported', entry: unsupportedEntry(rule, unique.length > 0 ? unique : ['pattern']) };
  }

  const output = renderRedirectLine(source.value, destination.value, resolved.status);
  return {
    kind: 'written',
    rule: {
      file: rule.location.file,
      line: rule.location.line,
      from: rule.from,
      to: rule.to,
      status: resolved.status,
      statusOrigin: resolved.origin,
      output,
      dynamic: isDynamicPattern(source.value, destination.value),
      caveat: shadowingCaveat(rule),
    },
  };
}

function unsupportedEntry(rule: MigrationRedirect, reasons: UnsupportedReason[]): UnsupportedEntry {
  return {
    file: rule.location.file,
    line: rule.location.line,
    from: rule.from,
    to: rule.to,
    reasons,
    alternative: chooseAlternative(reasons),
    message: messageForReasons(reasons),
  };
}

function dedupe(reasons: readonly UnsupportedReason[]): UnsupportedReason[] {
  return [...new Set(reasons)];
}
