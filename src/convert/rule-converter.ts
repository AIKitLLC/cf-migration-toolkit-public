import type { MigrationProject } from '../redirects/migration-document.js';
import { classifyBehavior, classifyNote } from './classify-behavior.js';
import { classifyHeader } from './classify-header.js';
import { classifyRedirect } from './classify-redirect.js';
import type { ConversionDraft, UnsupportedEntry, WrittenHeader, WrittenRedirect } from './conversion-draft.js';

export function convertProject(project: MigrationProject): ConversionDraft {
  const written: WrittenRedirect[] = [];
  const unsupported: UnsupportedEntry[] = [];
  for (const rule of project.redirects) {
    const outcome = classifyRedirect(rule);
    if (outcome.kind === 'written') written.push(outcome.rule);
    else unsupported.push(outcome.entry);
  }
  const headers: WrittenHeader[] = [];
  for (const rule of project.headers) {
    const outcome = classifyHeader(rule);
    if (outcome.kind === 'written') headers.push(outcome.rule);
    else unsupported.push(outcome.entry);
  }
  for (const behavior of project.behaviors) unsupported.push(classifyBehavior(behavior));
  for (const note of project.notes) unsupported.push(classifyNote(note));
  return {
    redirects: orderStaticFirst(written),
    headers,
    unsupported,
  };
}

function orderStaticFirst(rules: readonly WrittenRedirect[]): WrittenRedirect[] {
  return [...rules.filter((rule) => !rule.dynamic), ...rules.filter((rule) => rule.dynamic)];
}
