source: fixture

# cfmt convert

## Summary

| | |
| --- | ---: |
| Written redirects | 1 |
| Unsupported | 0 |
| Header rules | 0 |
| Static redirects | 0 |
| Dynamic redirects | 1 |

## Redirects

- `/old-blog/* /blog/:splat 301` — This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.

## Unsupported

None.

## Headers

None.
