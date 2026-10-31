import type { Finding } from '../domain/finding.js';
import type { PageSnapshot } from '../domain/page-snapshot.js';
import type { Comparator } from './comparator.js';
import { classifyStatusChange } from './classify-status-change.js';
import type { ComparisonInput } from './comparison-input.js';

export class StatusComparator implements Comparator {
  compare(input: ComparisonInput): readonly Finding[] {
    const findings: Finding[] = [];
    const first = classifyStatusChange(input.oldSnapshot.first.status, input.newSnapshot.first.status);
    if (first) {
      findings.push(statusFinding(input.path, first, input.oldSnapshot.first.status, input.newSnapshot.first.status));
    }
    if (finalStatusRepeatsFirst(input.oldSnapshot, input.newSnapshot)) return findings;
    const finalSeverity = classifyStatusChange(input.oldSnapshot.final.status, input.newSnapshot.final.status);
    if (finalSeverity) {
      findings.push(
        statusFinding(input.path, finalSeverity, input.oldSnapshot.final.status, input.newSnapshot.final.status),
      );
    }
    return findings;
  }
}

function finalStatusRepeatsFirst(oldSnapshot: PageSnapshot, newSnapshot: PageSnapshot): boolean {
  return (
    oldSnapshot.final.status === oldSnapshot.first.status &&
    newSnapshot.final.status === newSnapshot.first.status
  );
}

function statusFinding(path: string, severity: Finding['severity'], oldStatus: number, newStatus: number): Finding {
  return {
    path,
    check: 'status-changed',
    severity,
    old: String(oldStatus),
    new: String(newStatus),
  };
}
