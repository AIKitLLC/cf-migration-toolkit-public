source: fixture

# cfmt verify

Old origin: `http://127.0.0.1:41731`

New origin: `http://127.0.0.1:41732`

## Summary

| | |
| --- | ---: |
| URLs | 1 |
| Errors | 1 |
| Warnings | 1 |
| Info | 0 |

## Errors

### redirect-status-changed

A permanent redirect (301 or 308) came back temporary (302 or 307). Netlify treats a rule with no status code as 301. Cloudflare treats a `_redirects` rule with no status code as 302, so copying the file across downgrades the redirect.

| Path | Old | New |
| --- | --- | --- |
| `/old-blog/sample` | 301 | 302 |

## Warnings

### status-changed

| Path | Old | New |
| --- | --- | --- |
| `/old-blog/sample` | 301 | 302 |

## Info

None.
