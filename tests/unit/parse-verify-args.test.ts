import { describe, expect, it, vi } from 'vitest';
import { assertLiveOriginsArePublic } from '../../src/cli/assert-live-origins-public.js';
import { parseVerifyArgs } from '../../src/cli/parse-verify-args.js';
import { runCli } from '../../src/cli/run-cli.js';
import { isGlobalUnicast } from '../../src/normalize/global-unicast.js';

describe('parseVerifyArgs', () => {
  it('requires --source and accepts fixture or live', () => {
    expect(() =>
      parseVerifyArgs(['--old', 'https://old.example', '--new', 'https://new.example', '--crawl', '1']),
    ).toThrow(/--source/);
    const args = parseVerifyArgs([
      '--old=https://old.example',
      '--new', 'https://new.example',
      '--source', 'live',
      '--urls', 'urls.txt',
      '--fail-on', 'warn',
      '--concurrency', '2',
    ]);
    expect(args).toMatchObject({
      source: 'live',
      oldOrigin: 'https://old.example',
      newOrigin: 'https://new.example',
      urlFiles: ['urls.txt'],
      failOnWarn: true,
      concurrency: 2,
    });
  });

  it('rejects a repeated --source', () => {
    expect(() =>
      parseVerifyArgs([
        '--old',
        'https://old.example',
        '--new',
        'https://new.example',
        '--source',
        'fixture',
        '--source',
        'live',
        '--crawl',
        '1',
      ]),
    ).toThrow('--source was passed more than once');
  });

  it('rejects credential headers and accepts --fail-on-warn', () => {
    const base = ['--old', 'https://old.example', '--new', 'https://new.example', '--source', 'fixture', '--crawl', '1'];
    for (const name of ['set-cookie', 'Authorization', 'cookie', 'proxy-authorization', 'X-Api-Key']) {
      expect(() => parseVerifyArgs([...base, '--headers', name])).toThrow(new RegExp(name.toLowerCase()));
    }
    expect(() => parseVerifyArgs([...base, '--headers', 'content-type,set-cookie'])).toThrow(/set-cookie/);
    expect(() => parseVerifyArgs([...base, '--fail-on-warn=true'])).toThrow(/does not take a value/);
    expect(parseVerifyArgs([...base, '--fail-on-warn']).failOnWarn).toBe(true);
  });

  it('rejects an origin that includes a path', () => {
    expect(() =>
      parseVerifyArgs([
        '--old',
        'https://old.example/blog',
        '--new',
        'https://new.example',
        '--source',
        'fixture',
        '--crawl',
        '1',
      ]),
    ).toThrow(/path/);
  });
});

describe('runCli usage', () => {
  it('exits 2 when --source is missing', async () => {
    const code = await runCli(['verify', '--old', 'https://old.example', '--new', 'https://new.example', '--crawl', '1']);
    expect(code).toBe(2);
  });

  it('exits 0 for help', async () => {
    const code = await runCli(['verify', '--help']);
    expect(code).toBe(0);
  });

  it('exits 2 when --source is passed more than once', async () => {
    const written: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    try {
      const code = await runCli([
        'verify',
        '--old',
        'https://old.example',
        '--new',
        'https://new.example',
        '--source',
        'fixture',
        '--source=live',
        '--crawl',
        '1',
      ]);
      expect(code).toBe(2);
      expect(written.join('')).toContain('--source was passed more than once');
    } finally {
      spy.mockRestore();
    }
  });
});

const BLOCKED_ORIGINS = [
  'http://0.0.0.0',
  'http://127.0.0.1',
  'http://127.255.255.255',
  'http://10.1.2.3',
  'http://100.64.0.1',
  'http://169.254.1.1',
  'http://172.16.0.1',
  'http://172.31.255.1',
  'http://192.168.0.1',
  'http://198.18.0.1',
  'http://224.0.0.1',
  'http://255.255.255.255',
  'http://[::]',
  'http://[::1]',
  'http://[fe80::1]',
  'http://[fc00::1]',
  'http://[fd12:3456:789a::1]',
  'http://[ff02::1]',
  'http://[::ffff:127.0.0.1]',
  'http://[::ffff:1.1.1.1]',
  'http://[::ffff:0:7f00:1]',
  'http://[64:ff9b::7f00:1]',
  'http://[2002:7f00:1::]',
];

describe('live origins', () => {
  it.each([
    '0.0.0.0',
    '0.255.255.255',
    '127.0.0.1',
    '127.255.255.255',
    '10.0.0.1',
    '10.255.255.255',
    '100.64.0.1',
    '100.127.255.255',
    '169.254.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '198.18.0.1',
    '198.19.255.255',
    '224.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '0:0:0:0:0:0:0:1',
    'fe80::1',
    'fc00::',
    'fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:1.1.1.1',
    '::ffff:10.1.2.3',
    '::ffff:7f00:1',
    '::ffff:0:7f00:1',
    '64:ff9b::7f00:1',
    '64:ff9b::101:101',
    '2002:7f00:1::',
    '2002:101:101::',
  ])('rejects %s because it is not global unicast', (address) => {
    expect(isGlobalUnicast(address)).toBe(false);
  });

  it.each([
    '1.1.1.1',
    '8.8.8.8',
    '100.128.0.1',
    '172.15.255.255',
    '172.32.0.1',
    '11.0.0.1',
    '192.167.1.1',
    '192.169.1.1',
    '169.253.1.1',
    '169.255.1.1',
    '126.0.0.1',
    '198.20.0.1',
    '2001:4860:4860::8888',
    '::2',
  ])('allows %s as global unicast', (address) => {
    expect(isGlobalUnicast(address)).toBe(true);
  });

  it.each(BLOCKED_ORIGINS)('exits 2 for --source live against %s', async (origin) => {
    const written: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });
    try {
      const code = await runCli([
        'verify',
        '--old',
        origin,
        '--new',
        'https://1.1.1.1',
        '--source',
        'live',
        '--crawl',
        '1',
      ]);
      expect(code).toBe(2);
      expect(written.join('')).toContain('not a global unicast address');
    } finally {
      spy.mockRestore();
    }
  });

  it('exits 2 when the new origin is private and the old origin is public', async () => {
    const code = await runCli([
      'verify',
      '--old',
      'https://8.8.8.8',
      '--new',
      'http://10.0.0.1',
      '--source',
      'live',
      '--crawl',
      '1',
    ]);
    expect(code).toBe(2);
  });

  it('refuses a hostname that resolves to a private address on either side', async () => {
    const seen: string[] = [];
    await expect(
      assertLiveOriginsArePublic('https://old.example', 'https://new.example', async (hostname) => {
        seen.push(hostname);
        return [{ address: hostname === 'old.example' ? '10.2.3.4' : '1.1.1.1' }];
      }),
    ).rejects.toThrow(/old\.example resolves to 10\.2\.3\.4/);
    expect(seen).toEqual(['old.example']);

    await expect(
      assertLiveOriginsArePublic('https://old.example', 'https://internal.example', async (hostname) => [
        { address: hostname === 'internal.example' ? '::1' : '8.8.8.8' },
      ]),
    ).rejects.toThrow(/internal\.example resolves to ::1/);

    await expect(
      assertLiveOriginsArePublic('https://old.example', 'https://new.example', async () => [
        { address: '1.1.1.1' },
        { address: '192.168.1.9' },
      ]),
    ).rejects.toThrow(/192\.168\.1\.9/);

    await expect(
      assertLiveOriginsArePublic('https://old.example', 'https://new.example', async () => [{ address: '8.8.8.8' }]),
    ).resolves.toBeUndefined();
  });
});
