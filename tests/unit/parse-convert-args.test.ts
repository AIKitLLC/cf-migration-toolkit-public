import { describe, expect, it } from 'vitest';
import { parseConvertArgs } from '../../src/cli/parse-convert-args.js';
import { runCli } from '../../src/cli/run-cli.js';

describe('parseConvertArgs', () => {
  it('requires --source and accepts repeated inputs', () => {
    expect(() => parseConvertArgs(['--input', 'netlify.toml', '--out', 'out'])).toThrow(/--source/);
    expect(parseConvertArgs([
      '--input',
      '_redirects',
      '--input=vercel.json',
      '--out',
      'out',
      '--source',
      'fixture',
    ])).toMatchObject({
      inputs: ['_redirects', 'vercel.json'],
      outDir: 'out',
      source: 'fixture',
    });
  });

  it('exits 2 for invalid convert arguments and 0 for help', async () => {
    expect(await runCli(['convert', '--out', 'out'])).toBe(2);
    expect(await runCli(['convert', '--help'])).toBe(0);
  });
});
