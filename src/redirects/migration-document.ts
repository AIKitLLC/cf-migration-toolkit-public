export type MigrationPlatform = 'netlify' | 'vercel';

export interface SourceLocation {
  file: string;
  line: number;
}

export interface HeaderField {
  name: string;
  value: string;
}

export type ConditionKind = 'country' | 'language' | 'role' | 'cookie' | 'query' | 'has' | 'missing';

export interface MatchCondition {
  kind: ConditionKind;
  detail: string;
}

export interface MigrationRedirect {
  location: SourceLocation;
  platform: MigrationPlatform;
  kind: 'redirect' | 'rewrite';
  from: string;
  to: string;
  status: number | null;
  explicitStatus: boolean;
  permanent: boolean | null;
  force: boolean;
  conditions: readonly MatchCondition[];
  signed: boolean;
  proxyRequestHeaders: boolean;
}

export interface MigrationHeaderRule {
  location: SourceLocation;
  platform: MigrationPlatform;
  path: string;
  headers: readonly HeaderField[];
  conditions: readonly MatchCondition[];
}

export interface MigrationBehavior {
  location: SourceLocation;
  name: 'trailing-slash' | 'clean-urls';
  value: boolean;
}

export interface MigrationNote {
  location: SourceLocation;
  detail: string;
}

export interface MigrationProject {
  redirects: MigrationRedirect[];
  headers: MigrationHeaderRule[];
  behaviors: MigrationBehavior[];
  notes: MigrationNote[];
}

export function emptyMigrationProject(): MigrationProject {
  return { redirects: [], headers: [], behaviors: [], notes: [] };
}

export function mergeMigrationProjects(projects: readonly MigrationProject[]): MigrationProject {
  return {
    redirects: projects.flatMap((project) => project.redirects),
    headers: projects.flatMap((project) => project.headers),
    behaviors: projects.flatMap((project) => project.behaviors),
    notes: projects.flatMap((project) => project.notes),
  };
}
