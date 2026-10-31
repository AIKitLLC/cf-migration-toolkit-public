source: fixture

# cfmt convert

## Summary

| | |
| --- | ---: |
| Written redirects | 5 |
| Unsupported | 0 |
| Header rules | 1 |
| Static redirects | 4 |
| Dynamic redirects | 1 |

## Redirects

- `/ein /faq 301` — This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.
- `/apply-for-ein /faq 302` — This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.
- `/estimated-tax-dates /faq 301` — This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.
- `/llc-ein /faq 200` — This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.
- `/library/* /faq 301` — This rule is not forced. Netlify skips an unforced rule when a file already exists, and Vercel applies rewrites after the filesystem. Cloudflare _redirects always applies the rule, even when an asset exists.

## Unsupported

None.

## Headers

- `/*`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`
  - `X-Robots-Tag: noindex`
  - `Cache-Control: public, max-age=0, must-revalidate`
