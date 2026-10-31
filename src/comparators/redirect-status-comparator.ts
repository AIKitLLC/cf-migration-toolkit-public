import type { Finding } from '../domain/finding.js';
import type { Comparator } from './comparator.js';
import { classifyRedirectStatusChange } from './classify-redirect-status-change.js';
import type { ComparisonInput } from './comparison-input.js';

export class RedirectStatusComparator implements Comparator {
  compare(input: ComparisonInput): readonly Finding[] {
    const severity = classifyRedirectStatusChange(
      input.oldSnapshot.first.status,
      input.newSnapshot.first.status,
    );
    if (!severity) return [];
    return [
      {
        path: input.path,
        check: 'redirect-status-changed',
        severity,
        old: String(input.oldSnapshot.first.status),
        new: String(input.newSnapshot.first.status),
      },
    ];
  }
}
