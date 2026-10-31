export const CHECK_IDS = [
  'redirect-status-changed',
  'redirect-target-changed',
  'status-changed',
  'canonical-changed',
  'header-changed',
  'header-missing',
  'header-added',
  'fetch-failed',
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

const RANK = new Map<CheckId, number>(CHECK_IDS.map((check, index) => [check, index]));

export function checkRank(check: CheckId): number {
  return RANK.get(check) ?? CHECK_IDS.length;
}
