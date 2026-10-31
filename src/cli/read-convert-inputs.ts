import { access, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { CONVERT_INPUT_NAMES, migrationFromNamedFile } from '../redirects/migration-from-named-file.js';
import { mergeMigrationProjects } from '../redirects/migration-document.js';
import type { MigrationProject } from '../redirects/migration-document.js';

export async function readConvertInputs(paths: readonly string[]): Promise<MigrationProject> {
  const projects: MigrationProject[] = [];
  for (const input of paths) {
    const info = await stat(input);
    if (info.isDirectory()) {
      const found = await readDirectory(input);
      if (found.length === 0) {
        throw new Error(`No netlify.toml, _redirects, _headers, or vercel.json in ${input}`);
      }
      projects.push(...found);
      continue;
    }
    projects.push(migrationFromNamedFile(await readFile(input, 'utf8'), input));
  }
  return mergeMigrationProjects(projects);
}

async function readDirectory(directory: string): Promise<MigrationProject[]> {
  const projects: MigrationProject[] = [];
  for (const name of CONVERT_INPUT_NAMES) {
    const path = join(directory, name);
    if (!(await exists(path))) continue;
    projects.push(migrationFromNamedFile(await readFile(path, 'utf8'), path));
  }
  return projects;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
