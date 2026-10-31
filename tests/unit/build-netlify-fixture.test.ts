import { describe, expect, it } from 'vitest';
import { mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BUNDLE_FILES, assertBundleShape, fixtureOrigin, renderHeaders, renderRedirects, stripNetlifyFormAttributes } from '../../scripts/d1/build-netlify-fixture.js';
import { parseNetlifyTomlRedirects } from '../../src/redirects/parse-netlify-toml.js';

const TOML = `[[redirects]]
  from = "/a"
  to = "/b"

[[redirects]]
  from = "/c"
  to = "/b"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex"
`;

describe('Netlify fixture bundle', () => {
  it('keeps an omitted status omitted in _redirects', () => {
    expect(renderRedirects(parseNetlifyTomlRedirects(TOML)).split('\n').slice(1, 3)).toEqual(['/a /b', '/c /b 200']);
  });

  it('writes _headers from netlify.toml', () => {
    expect(renderHeaders(TOML)).toContain('/*\n  X-Robots-Tag: noindex\n');
  });

  it('requires an https netlify.app origin unless overridden', () => {
    expect(fixtureOrigin('https://site.netlify.app')).toBe('https://site.netlify.app');
    expect(() => fixtureOrigin(undefined)).toThrow(/required/);
    expect(() => fixtureOrigin('https://example.com')).toThrow();
    expect(fixtureOrigin('https://example.com', true)).toBe('https://example.com');
    expect(() => fixtureOrigin('http://127.0.0.1:41751', true)).toThrow();
    expect(() => fixtureOrigin('https://site.netlify.app/x')).toThrow();
  });

  it('strips Netlify form attributes and keeps the rest of the form', () => {
    const html = '<form name="q" method="POST" action="/form-stub" data-netlify="true" netlify-honeypot="bot-field"><input name="bot-field"></form>';
    expect(stripNetlifyFormAttributes(html)).toBe('<form name="q" method="POST" action="/form-stub"><input name="bot-field"></form>');
    expect(stripNetlifyFormAttributes('<form netlify data-netlify-recaptcha="true">')).toBe('<form>');
  });

  it('rejects extra files and symlinks in the bundle', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cfmt-nf-'));
    for (const name of BUNDLE_FILES) await writeFile(join(dir, name), 'x');
    await expect(assertBundleShape(dir)).resolves.toBeUndefined();
    await writeFile(join(dir, 'extra.txt'), 'x');
    await expect(assertBundleShape(dir)).rejects.toThrow(/allowlist/);
    const linked = await mkdtemp(join(tmpdir(), 'cfmt-nf-'));
    for (const name of BUNDLE_FILES.filter((n) => n !== 'robots.txt')) await writeFile(join(linked, name), 'x');
    await symlink('/etc/hostname', join(linked, 'robots.txt'));
    await expect(assertBundleShape(linked)).rejects.toThrow(/symlink/);
  });
});
