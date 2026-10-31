import type { HeaderField, MigrationHeaderRule } from '../redirects/migration-document.js';
import { reasonsForConditions } from './condition-reasons.js';
import type { UnsupportedEntry, WrittenHeader } from './conversion-draft.js';
import { translateEndpoint } from './translate-pattern.js';
import { chooseAlternative, messageForReasons } from './unsupported-reason.js';
import type { UnsupportedReason } from './unsupported-reason.js';

export type ClassifiedHeader =
  | { kind: 'written'; rule: WrittenHeader }
  | { kind: 'unsupported'; entry: UnsupportedEntry };

export function classifyHeader(rule: MigrationHeaderRule): ClassifiedHeader {
  const reasons: UnsupportedReason[] = [...reasonsForConditions(rule.conditions)];
  const translated = translateEndpoint(rule.path, 'source', rule.platform);
  if (!translated.ok) reasons.push('header-pattern');
  if (reasons.length > 0 || !translated.ok) {
    return {
      kind: 'unsupported',
      entry: {
        file: rule.location.file,
        line: rule.location.line,
        from: rule.path,
        to: '',
        reasons: reasons.length > 0 ? reasons : ['header-pattern'],
        alternative: chooseAlternative(reasons.length > 0 ? reasons : ['header-pattern']),
        message: messageForReasons(reasons.length > 0 ? reasons : ['header-pattern']),
      },
    };
  }
  return {
    kind: 'written',
    rule: {
      file: rule.location.file,
      line: rule.location.line,
      path: translated.value,
      lines: rule.headers.map(renderHeaderField),
    },
  };
}

function renderHeaderField(field: HeaderField): string {
  if (field.name.startsWith('!') && field.value === '') return `  ${field.name}`;
  return `  ${field.name}: ${field.value}`;
}
