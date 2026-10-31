import type { MigrationBehavior, MigrationNote } from '../redirects/migration-document.js';
import type { UnsupportedEntry } from './conversion-draft.js';
import { chooseAlternative, messageForReasons } from './unsupported-reason.js';
import type { UnsupportedReason } from './unsupported-reason.js';

export function classifyBehavior(behavior: MigrationBehavior): UnsupportedEntry {
  const reason: UnsupportedReason = behavior.name === 'trailing-slash' ? 'trailing-slash' : 'clean-urls';
  return {
    file: behavior.location.file,
    line: behavior.location.line,
    from: behavior.name,
    to: String(behavior.value),
    reasons: [reason],
    alternative: chooseAlternative([reason]),
    message: messageForReasons([reason]),
  };
}

export function classifyNote(note: MigrationNote): UnsupportedEntry {
  return {
    file: note.location.file,
    line: note.location.line,
    from: 'routes',
    to: '',
    reasons: ['ignored-routes'],
    alternative: chooseAlternative(['ignored-routes']),
    message: messageForReasons(['ignored-routes']),
  };
}
