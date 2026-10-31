import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { writeAtomic } from '../reporters/atomic-write.js';
import { assertCloudflareLimits } from '../convert/assert-cloudflare-limits.js';
import { CloudflareLimitError } from '../convert/cloudflare-limits.js';
import { buildConversionReport } from '../convert/conversion-report.js';
import { renderConversionJson } from '../convert/render-conversion-json.js';
import { renderConversionMarkdown } from '../convert/render-conversion-markdown.js';
import { renderHeadersFile } from '../convert/render-headers-file.js';
import { renderRedirectsFile } from '../convert/render-redirect-line.js';
import { convertProject } from '../convert/rule-converter.js';
import type { ConvertCliArgs } from './convert-cli-args.js';
import { printConvertSummary } from './print-convert-summary.js';
import { readConvertInputs } from './read-convert-inputs.js';

export async function executeConvert(args: ConvertCliArgs): Promise<number> {
  const project = await readConvertInputs(args.inputs);
  const draft = convertProject(project);
  try {
    assertCloudflareLimits(draft);
  } catch (error) {
    if (!(error instanceof CloudflareLimitError)) throw error;
    const report = buildConversionReport(draft, args.source, error.message);
    await writeReports(report, args);
    process.stderr.write(`${error.message}\n`);
    printConvertSummary(report);
    return 1;
  }
  const report = buildConversionReport(draft, args.source);
  await mkdir(args.outDir, { recursive: true });
  await writeFile(join(args.outDir, '_redirects'), renderRedirectsFile(draft.redirects.map((rule) => rule.output)), 'utf8');
  if (draft.headers.length > 0) {
    await writeFile(join(args.outDir, '_headers'), renderHeadersFile(draft.headers), 'utf8');
  }
  await writeReports(report, args);
  if (!args.jsonPath && !args.mdPath) process.stdout.write(renderConversionMarkdown(report));
  printConvertSummary(report);
  return 0;
}

async function writeReports(report: ReturnType<typeof buildConversionReport>, args: ConvertCliArgs): Promise<void> {
  if (args.jsonPath) await writeAtomic(args.jsonPath, renderConversionJson(report));
  if (args.mdPath) await writeAtomic(args.mdPath, renderConversionMarkdown(report));
}
