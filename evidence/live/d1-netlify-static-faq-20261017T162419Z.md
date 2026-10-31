source: live
evidence: E2

# cfmt verify

Old origin: `https://<site>.netlify.app`

New origin: `https://d1-netlify-static-faq.<subdomain>.workers.dev`

## Summary

| | |
| --- | ---: |
| URLs | 8 |
| Errors | 2 |
| Warnings | 30 |

## Errors

### header-missing

| Path | Old | New |
| --- | --- | --- |
| `/ein` | x-robots-tag: (missing) | x-robots-tag: noindex |
| `/library/sample` | x-robots-tag: (missing) | x-robots-tag: noindex |

## Warnings

### header-changed

| Path | Old | New |
| --- | --- | --- |
| `/` | content-type: text/html; charset=UTF-8 | content-type: text/html |
| `/` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/apply-for-ein` | final content-type: text/html; charset=UTF-8 | final content-type: text/html |
| `/apply-for-ein` | final strict-transport-security: max-age=31536000; includeSubDomains; preload | final strict-transport-security: max-age=31536000 |
| `/apply-for-ein` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/ein` | final content-type: text/html; charset=UTF-8 | final content-type: text/html |
| `/ein` | final strict-transport-security: max-age=31536000; includeSubDomains; preload | final strict-transport-security: max-age=31536000 |
| `/ein` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/estimated-tax-dates` | final content-type: text/html; charset=UTF-8 | final content-type: text/html |
| `/estimated-tax-dates` | final strict-transport-security: max-age=31536000; includeSubDomains; preload | final strict-transport-security: max-age=31536000 |
| `/estimated-tax-dates` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/faq` | content-type: text/html; charset=UTF-8 | content-type: text/html |
| `/faq` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/form-stub` | content-type: text/html; charset=UTF-8 | content-type: text/html |
| `/form-stub` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/library/sample` | final content-type: text/html; charset=UTF-8 | final content-type: text/html |
| `/library/sample` | final strict-transport-security: max-age=31536000; includeSubDomains; preload | final strict-transport-security: max-age=31536000 |
| `/library/sample` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |
| `/llc-ein` | content-type: text/html; charset=UTF-8 | content-type: text/html |
| `/llc-ein` | strict-transport-security: max-age=31536000; includeSubDomains; preload | strict-transport-security: max-age=31536000 |

### header-missing

| Path | Old | New |
| --- | --- | --- |
| `/apply-for-ein` | content-type: text/plain; charset=utf-8 | content-type: (missing) |
| `/ein` | content-security-policy: (missing) | content-security-policy: default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none' |
| `/ein` | content-type: text/plain | content-type: (missing) |
| `/ein` | referrer-policy: (missing) | referrer-policy: no-referrer |
| `/ein` | x-frame-options: (missing) | x-frame-options: DENY |
| `/estimated-tax-dates` | content-type: text/plain; charset=utf-8 | content-type: (missing) |
| `/library/sample` | content-security-policy: (missing) | content-security-policy: default-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none' |
| `/library/sample` | content-type: text/plain | content-type: (missing) |
| `/library/sample` | referrer-policy: (missing) | referrer-policy: no-referrer |
| `/library/sample` | x-frame-options: (missing) | x-frame-options: DENY |
