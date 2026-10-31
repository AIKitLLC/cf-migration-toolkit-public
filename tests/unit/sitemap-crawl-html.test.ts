import { describe, expect, it } from 'vitest';
import { readHtmlSignals } from '../../src/html/read-html-signals.js';
import { linkHeaderCanonicals } from '../../src/headers/link-canonical.js';
import { parseSitemapXml } from '../../src/url-sources/parse-sitemap-xml.js';
import { SitemapUrlSource } from '../../src/url-sources/sitemap-url-source.js';
import { CrawlUrlSource } from '../../src/url-sources/crawl-url-source.js';
import { responseView } from '../support/make-snapshot.js';
import { MapReader } from '../support/map-reader.js';

describe('parseSitemapXml', () => {
  it('reads a urlset and decodes entities', () => {
    const xml = `<?xml version="1.0"?>
      <urlset>
        <url><loc>https://old.example/a?x=1&amp;y=2</loc></url>
        <!-- <loc>https://old.example/hidden</loc> -->
      </urlset>`;
    expect(parseSitemapXml(xml)).toEqual({
      kind: 'urlset',
      locs: ['https://old.example/a?x=1&y=2'],
    });
  });

  it('recognizes a sitemap index', () => {
    const xml = `<sitemapindex><sitemap><loc><![CDATA[https://old.example/child.xml]]></loc></sitemap></sitemapindex>`;
    expect(parseSitemapXml(xml).kind).toBe('sitemapindex');
    expect(parseSitemapXml(xml).locs).toEqual(['https://old.example/child.xml']);
  });
});

describe('SitemapUrlSource', () => {
  it('follows a sitemap index to child urlsets', async () => {
    const origin = 'http://127.0.0.1:9';
    const reader = new MapReader({
      [`${origin}/sitemap.xml`]: responseView({
        url: `${origin}/sitemap.xml`,
        status: 200,
        headers: { 'content-type': 'application/xml' },
        body: `<sitemapindex><sitemap><loc>${origin}/child.xml</loc></sitemap></sitemapindex>`,
      }),
      [`${origin}/child.xml`]: responseView({
        url: `${origin}/child.xml`,
        status: 200,
        headers: { 'content-type': 'application/xml' },
        body: `<urlset>
          <url><loc>${origin}/a</loc></url>
          <url><loc>${origin}/b?x=1</loc></url>
        </urlset>`,
      }),
    });
    const paths = await new SitemapUrlSource([`${origin}/sitemap.xml`], reader).collect();
    expect(paths).toEqual(['/a', '/b?x=1']);
  });
});

describe('CrawlUrlSource', () => {
  it('walks same-host links breadth-first and stops at the limit', async () => {
    const origin = 'http://127.0.0.1:9';
    const page = (path: string, html: string) =>
      responseView({
        url: `${origin}${path}`,
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: html,
      });
    const reader = new MapReader({
      [`${origin}/`]: page('/', '<a href="/about">About</a><a href="https://example.com/no">No</a><a href="/blog/post">Post</a>'),
      [`${origin}/about`]: page('/about', '<a href="/">Home</a>'),
      [`${origin}/blog/post`]: page('/blog/post', '<a href="/blog/other">Other</a>'),
    });
    const paths = await new CrawlUrlSource(new URL(origin), 2, ['/'], reader).collect();
    expect(paths).toEqual(['/', '/about']);
    expect(reader.urls).not.toContain(`${origin}/blog/post`);
  });
});

describe('html and link canonicals', () => {
  it('reads canonical, robots, base, and anchors', () => {
    const signals = readHtmlSignals(`
      <html><head>
        <base href="/docs/">
        <link rel="canonical" href="/docs/page">
        <meta name="ROBOTS" content="noindex">
      </head><body><a href="guide.html">Guide</a></body></html>
    `);
    expect(signals).toMatchObject({
      canonicalHref: '/docs/page',
      metaRobots: 'noindex',
      baseHref: '/docs/',
      anchorHrefs: ['guide.html'],
    });
  });

  it('reads only rel=canonical targets from a Link header', () => {
    const header = '</app.css>; rel=preload, <https://example.com/a>; rel="canonical"';
    expect(linkHeaderCanonicals(header)).toEqual(['https://example.com/a']);
  });
});
