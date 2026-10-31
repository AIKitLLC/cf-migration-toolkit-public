import type { Finding } from '../domain/finding.js';
import type { ResponseView } from '../domain/response-view.js';
import { formatHeaderField } from '../headers/format-header-field.js';
import { classifyHeaderDifference } from './classify-header-difference.js';
import type { Comparator } from './comparator.js';
import type { ComparisonInput } from './comparison-input.js';

export class HeaderComparator implements Comparator {
  compare(input: ComparisonInput): readonly Finding[] {
    const findings = compareHeaderSet(input, input.oldSnapshot.first, input.newSnapshot.first, '');
    if (input.oldSnapshot.hops > 0 || input.newSnapshot.hops > 0) {
      findings.push(...compareHeaderSet(input, input.oldSnapshot.final, input.newSnapshot.final, 'final '));
    }
    return findings;
  }
}

function compareHeaderSet(
  input: ComparisonInput,
  oldView: ResponseView,
  newView: ResponseView,
  prefix: string,
): Finding[] {
  const findings: Finding[] = [];
  for (const name of input.headers) {
    if (name === 'link') continue;
    const oldValue = oldView.headers.get(name) ?? null;
    const newValue = newView.headers.get(name) ?? null;
    const difference = classifyHeaderDifference({
      name,
      oldValue,
      newValue,
      oldStatus: oldView.status,
      newStatus: newView.status,
    });
    if (!difference) continue;
    const label = `${prefix}${name}`;
    findings.push({
      path: input.path,
      check: difference.check,
      severity: difference.severity,
      old: formatHeaderField(label, oldValue),
      new: formatHeaderField(label, newValue),
    });
  }
  return findings;
}
