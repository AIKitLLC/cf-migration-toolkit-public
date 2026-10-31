export const SEVERITIES = ['error', 'warning', 'info'] as const;

export type Severity = (typeof SEVERITIES)[number];

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function severityRank(severity: Severity): number {
  return RANK[severity];
}
