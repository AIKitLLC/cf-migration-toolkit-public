export function backoffMs(attempt: number): number {
  return 25 * 2 ** attempt;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
