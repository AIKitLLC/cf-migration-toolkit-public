import type { MigrationProject, MigrationRedirect } from '../../redirects/migration-document.js';
import { resolveRedirectStatus } from '../../convert/resolve-redirect-status.js';
import { compileNetlifyPattern, type NetlifyPattern } from './compile-netlify-pattern.js';
import { headerRulesForPath } from './header-rules-for-path.js';
import { StaticAssetResolver, type AssetHit } from './static-asset-resolver.js';

export interface OriginPlan {
  status: number;
  headers: ReadonlyMap<string, string>;
  filePath?: string;
  locationPath?: string;
  emptyBody?: boolean;
}

interface CompiledRedirect {
  rule: MigrationRedirect;
  pattern: NetlifyPattern;
}

export class NetlifyRequestPlanner {
  private readonly redirects: readonly CompiledRedirect[];

  constructor(
    private readonly project: MigrationProject,
    private readonly assets: StaticAssetResolver,
  ) {
    this.redirects = project.redirects
      .filter((rule) => rule.from.startsWith('/'))
      .map((rule) => ({ rule, pattern: compileNetlifyPattern(rule.from) }));
  }

  plan(method: string, pathname: string): OriginPlan {
    const headers = headerRulesForPath(this.project.headers, pathname);
    if (method === 'POST' && pathname === '/form-stub') {
      return { status: 303, headers, locationPath: '/form-stub', emptyBody: true };
    }
    if (method !== 'GET' && method !== 'HEAD') {
      return { status: 405, headers, emptyBody: true };
    }
    const redirect = this.matchingRedirect(pathname);
    if (redirect) return redirect;
    return this.fromAsset(this.assets.resolve(pathname), headers);
  }

  private matchingRedirect(pathname: string): OriginPlan | null {
    for (const compiled of this.redirects) {
      const captures = compiled.pattern.match(pathname);
      if (!captures) continue;
      const asset = this.assets.resolve(pathname);
      if (asset.kind === 'file' && !compiled.rule.force) continue;
      const status = resolveRedirectStatus(compiled.rule).status;
      const target = compiled.pattern.substitute(compiled.rule.to, captures);
      const headers = headerRulesForPath(this.project.headers, pathname);
      if (status === 200) return this.rewrite(target, headers);
      return { status, headers, locationPath: target, emptyBody: true };
    }
    return null;
  }

  private rewrite(pathname: string, headers: ReadonlyMap<string, string>): OriginPlan {
    const asset = this.assets.resolve(pathname);
    if (asset.kind === 'file') return { status: 200, headers, filePath: asset.absolutePath };
    if (asset.kind === 'redirect') return this.rewrite(asset.pathname, headers);
    return { status: 404, headers, emptyBody: true };
  }

  private fromAsset(asset: AssetHit, headers: ReadonlyMap<string, string>): OriginPlan {
    if (asset.kind === 'file') return { status: 200, headers, filePath: asset.absolutePath };
    if (asset.kind === 'redirect') {
      return { status: asset.status, headers, locationPath: asset.pathname, emptyBody: true };
    }
    return { status: 404, headers, emptyBody: true };
  }
}
