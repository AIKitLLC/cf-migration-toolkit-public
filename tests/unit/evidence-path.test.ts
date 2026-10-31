import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildReport } from '../../src/domain/build-report.js';
import { portablePath } from '../../src/convert/portable-path.js';
import { timestampedEvidencePath } from '../../src/reporters/evidence-path.js';
import { JsonReportRenderer } from '../../src/reporters/json-report-renderer.js';
import { ReportFileWriter } from '../../src/reporters/write-report-file.js';

const now = new Date('2026-10-15T17:05:12.987Z');

describe('evidence paths', () => {
  it('stamps a live evidence file and leaves other paths alone', () => {
    expect(timestampedEvidencePath('evidence/live/d1-netlify-static-faq.json', now)).toBe(
      join('evidence', 'live', 'd1-netlify-static-faq-20261015T170512Z.json'),
    );
    expect(timestampedEvidencePath('evidence/live/d1-netlify-static-faq-20261015T170512Z.md', now)).toBe(
      'evidence/live/d1-netlify-static-faq-20261015T170512Z.md',
    );
    expect(timestampedEvidencePath('examples/d1-netlify-static-faq/parity/report.json', now)).toBe(
      'examples/d1-netlify-static-faq/parity/report.json',
    );
  });

  it('writes a report by rename and does not leave a temporary file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cfmt-report-'));
    const destination = join(dir, 'evidence', 'live', 'report.json');
    const written = await new ReportFileWriter(new JsonReportRenderer()).write(
      buildReport({
        source: 'live',
        oldOrigin: 'https://old.example',
        newOrigin: 'https://new.example',
        urlCount: 0,
        findings: [],
      }),
      destination,
      now,
    );
    expect(written).toBe(join(dir, 'evidence', 'live', 'report-20261015T170512Z.json'));
    const body = JSON.parse(await readFile(written, 'utf8')) as { summary: { evidence?: string } };
    expect(body.summary.evidence).toBe('E2');
    const names = await readdir(join(dir, 'evidence', 'live'));
    expect(names).toEqual(['report-20261015T170512Z.json']);
  });
});

describe('portable convert paths', () => {
  it('keeps a path inside the working directory relative and leaves a path outside it', () => {
    expect(portablePath('/workspace/examples/d1-netlify-static-faq/site/netlify.toml', '/workspace')).toBe(
      'examples/d1-netlify-static-faq/site/netlify.toml',
    );
    expect(portablePath('/tmp/outside/netlify.toml', '/workspace')).toBe('/tmp/outside/netlify.toml');
    expect(portablePath('examples/convert-redirect-downgrade/input/_redirects', '/workspace')).toBe(
      'examples/convert-redirect-downgrade/input/_redirects',
    );
  });
});
