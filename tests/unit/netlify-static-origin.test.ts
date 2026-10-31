import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { startNetlifyStaticOrigin } from '../../src/demo/netlify-static-origin/start-netlify-static-origin.js';

const toml = `
[[redirects]]
  from = "/ein"
  to = "/faq"
  status = 301

[[redirects]]
  from = "/apply-for-ein"
  to = "/faq"
  status = 302

[[redirects]]
  from = "/estimated-tax-dates"
  to = "/faq"

[[redirects]]
  from = "/library/*"
  to = "/faq"
  status = 301

[[redirects]]
  from = "/llc-ein"
  to = "/faq"
  status = 200

[[redirects]]
  from = "/faq"
  to = "/elsewhere"
  status = 302

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex"
    X-Frame-Options = "DENY"
`;

describe('netlify-style static origin', () => {
  let directory: string | undefined;
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) await close();
    if (directory) await rm(directory, { recursive: true, force: true });
    close = undefined;
    directory = undefined;
  });

  it('uses 301 when a rule omits the status, rewrites 200, and does not shadow a file', async () => {
    directory = await mkdtemp(join(tmpdir(), 'netlify-origin-'));
    await writeFile(join(directory, 'index.html'), '<p>home</p>', 'utf8');
    await writeFile(join(directory, 'faq.html'), '<p>faq body</p>', 'utf8');
    await writeFile(join(directory, 'netlify.toml'), toml, 'utf8');
    const origin = await startNetlifyStaticOrigin({
      root: directory,
      netlifyTomlPath: join(directory, 'netlify.toml'),
    });
    close = origin.close;

    const omitted = await fetch(`${origin.origin}/estimated-tax-dates`, { redirect: 'manual' });
    expect(omitted.status).toBe(301);
    expect(omitted.headers.get('location')).toBe(`${origin.origin}/faq`);

    const temporary = await fetch(`${origin.origin}/apply-for-ein`, { redirect: 'manual' });
    expect(temporary.status).toBe(302);

    const splat = await fetch(`${origin.origin}/library/sample`, { redirect: 'manual' });
    expect(splat.status).toBe(301);
    expect(splat.headers.get('location')).toBe(`${origin.origin}/faq`);

    const rewrite = await fetch(`${origin.origin}/llc-ein`, { redirect: 'manual' });
    expect(rewrite.status).toBe(200);
    expect(await rewrite.text()).toContain('faq body');
    expect(rewrite.headers.get('x-robots-tag')).toBe('noindex');

    const shadowed = await fetch(`${origin.origin}/faq`, { redirect: 'manual' });
    expect(shadowed.status).toBe(200);
    expect(await shadowed.text()).toContain('faq body');

    const posted = await fetch(`${origin.origin}/form-stub`, {
      method: 'POST',
      body: 'secret-note',
      redirect: 'manual',
    });
    expect(posted.status).toBe(303);
    expect(await posted.text()).not.toContain('secret-note');
  });
});
