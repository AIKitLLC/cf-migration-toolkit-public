label: simulated-local

elapsedMs: 5.698

Two copies of the demo assets ran under wrangler dev --local. A local switch sent traffic to v2, then moved it to v1. elapsedMs is the time from that move until the switch returned the v1 marker. This is not a workers.dev timing.

The workers.dev rollback timing is not measured here. examples/d1-netlify-static-faq/GO-LIVE.md records it after maintainer approval. That measured value replaces this simulated-local number.
