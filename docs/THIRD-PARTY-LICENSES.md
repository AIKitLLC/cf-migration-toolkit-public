# Third-party licenses

Scope is this repository, including the workspace demo `examples/d1-netlify-static-faq/site`. Scanned on 2026-10-23 from `main` at `403ba42`, with pnpm 10.33.3.

## Command

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter cf-migration-toolkit licenses list --prod
pnpm licenses list --prod
```

`pnpm install --frozen-lockfile` exited 0. The root `package.json` is `private` and declares `"license": "MIT"`.

## Toolkit production closure

`pnpm --filter cf-migration-toolkit licenses list --prod` lists the production closure of `cf-migration-toolkit`. Direct dependencies are `ipaddr.js@2.5.0` (MIT), `node-html-parser@9.0.4` (MIT), and `undici@7.30.0` (MIT).

| Package | Version | License |
| --- | --- | --- |
| `boolbase` | 1.0.0 | ISC |
| `css-select` | 5.2.2 | BSD-2-Clause |
| `css-what` | 6.2.2 | BSD-2-Clause |
| `dom-serializer` | 2.0.0 | MIT |
| `domelementtype` | 2.3.0 | BSD-2-Clause |
| `domhandler` | 5.0.3 | BSD-2-Clause |
| `domutils` | 3.2.2 | BSD-2-Clause |
| `entities` | 4.5.0, 8.1.0 | BSD-2-Clause |
| `ipaddr.js` | 2.5.0 | MIT |
| `node-html-parser` | 9.0.4 | MIT |
| `nth-check` | 2.1.1 | BSD-2-Clause |
| `undici` | 7.30.0 | MIT |

No GPL, AGPL, LGPL, MPL, or unknown license is in that closure.

## Workspace production closure

`pnpm licenses list --prod` from the root also includes `@cfmt/d1-netlify-static-faq`, whose direct production dependency is `astro@7.3.8` (MIT). The rest of that closure is transitive.

### Non-permissive licenses

| Package | Version | License | Note |
| --- | --- | --- | --- |
| `@img/sharp-libvips-linux-x64` | 1.3.4 | LGPL-3.0-or-later | Prebuilt libvips used by `sharp@0.35.5`. Not AGPL. |
| `lightningcss` | 1.33.0 | MPL-2.0 | File-level weak copyleft. Not GPL or AGPL. |
| `lightningcss-linux-x64-gnu` | 1.33.0 | MPL-2.0 | Same terms as `lightningcss`. |

No GPL-2.0, GPL-3.0, AGPL, or unknown license.

The other licenses in that closure are permissive: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, BlueOak-1.0.0, and CC0-1.0.
