import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'node-html-parser';

export interface UnsupportedForm {
  name: string;
  page: string;
  action: string;
  method: string;
  storesSubmission: false;
}

export interface FormUnsupportedReport {
  source: 'fixture';
  handler: 'unsupported';
  reason: string;
  alternative: 'stub';
  forms: UnsupportedForm[];
  stub: string;
}

export async function writeFormUnsupportedReport(distDir: string, outputPath: string): Promise<FormUnsupportedReport> {
  const report = await buildFormUnsupportedReport(distDir);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

export async function buildFormUnsupportedReport(distDir: string): Promise<FormUnsupportedReport> {
  const forms: UnsupportedForm[] = [];
  for (const file of await htmlFiles(distDir)) {
    const html = await readFile(file, 'utf8');
    const root = parse(html);
    for (const form of root.querySelectorAll('form')) {
      if (form.getAttribute('data-netlify') !== 'true') continue;
      forms.push({
        name: form.getAttribute('name') ?? '',
        page: `/${relative(distDir, file).replaceAll('\\', '/')}`,
        action: form.getAttribute('action') ?? '',
        method: (form.getAttribute('method') ?? 'GET').toUpperCase(),
        storesSubmission: false,
      });
    }
  }
  return {
    source: 'fixture',
    handler: 'unsupported',
    reason:
      'Netlify Forms are declared in HTML. cfmt convert reads redirect and header rules and has no Workers Static Assets equivalent for a form handler.',
    alternative: 'stub',
    forms,
    stub:
      'GET /form-stub is a static page. The local Netlify-style simulator accepts a submission and discards the body. Workers Static Assets do not run the Netlify form handler.',
  };
}

async function htmlFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}
