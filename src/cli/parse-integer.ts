export function parseInteger(value: string, flag: string, minimum: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${flag} expects an integer`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${flag} must be >= ${minimum}`);
  }
  return parsed;
}
