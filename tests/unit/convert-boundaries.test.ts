import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('convert module boundaries', () => {
  it('does not import the fetcher, comparators, cli, or demo', () => {
    const directory = join(process.cwd(), 'src', 'convert');
    const offenders: string[] = [];
    for (const file of readdirSync(directory)) {
      if (!file.endsWith('.ts')) continue;
      const text = readFileSync(join(directory, file), 'utf8');
      if (/from ['"][^'"]*(fetcher|comparators|cli|demo)/.test(text)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
