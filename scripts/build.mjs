#!/usr/bin/env node
/**
 * edBuddy Pro static build.  src/ -> dist/
 *
 *   node scripts/build.mjs              local build, images served from /assets/img
 *   CDN_URL=https://cdn.edbuddypro.com node scripts/build.mjs
 *                                       production build, images served from R2
 *
 * What it does, in order:
 *   1. copies styles, scripts, icons and public/ files into dist/
 *   2. turns every src/pages/**.html into a page: expands <!-- @include x -->
 *      from src/partials, fills {{tokens}} from site.config.json, writes SEO
 *      tags (canonical, Open Graph, Twitter), strips internal comments and
 *      drafting notes, points images at the CDN, and version-stamps CSS/JS
 *   3. writes sitemap.xml and robots.txt
 *   4. checks every page (title, description, one h1, alt text, internal
 *      links and #anchors) and fails the build on a broken link
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walk, imageManifest } from './lib/assets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);

const site = JSON.parse(readFileSync('site.config.json', 'utf8'));
const CDN = (process.env.CDN_URL || '').replace(/\/$/, '');
const DIST = 'dist';
const read = (f) => readFileSync(f, 'utf8');
const write = (f, s) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); };
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);

const warnings = [];
const errors = [];
const openItems = [];

// ── 1. static files ─────────────────────────────────────────────
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);
cpSync('src/styles', join(DIST, 'styles'), { recursive: true });
cpSync('src/scripts', join(DIST, 'scripts'), { recursive: true });
cpSync('src/assets/icons.svg', join(DIST, 'assets/icons.svg'));
if (existsSync('src/public')) cpSync('src/public', DIST, { recursive: true });
if (!CDN) cpSync('src/assets/img', join(DIST, 'assets/img'), { recursive: true });

const images = imageManifest();
const imageUrl = (p) => (CDN && images[p] ? `${CDN}/${images[p]}` : p);
const rewriteImages = (s) => s.replace(/\/assets\/img\/[\w./-]+\.(?:webp|png|jpe?g|svg|avif)/g, (m) => {
  if (!images[m]) errors.push(`missing image ${m}`);
  return imageUrl(m);
});

// version-stamp CSS + JS so they can be cached for a year
const version = {};
for (const f of walk(join(DIST, 'styles')).concat(walk(join(DIST, 'scripts')))) {
  const url = '/' + relative(DIST, f).split('\\').join('/');
  if (f.endsWith('.css')) write(f, rewriteImages(read(f)));
  version[url] = hash(read(f));
}
version['/assets/icons.svg'] = hash(read('src/assets/icons.svg'));
const stamp = (s) => s.replace(/(href|src)="(\/(?:styles|scripts)\/[\w.-]+\.(?:css|js)|\/assets\/icons\.svg)(#[\w-]+)?"/g,
  (m, attr, url, frag = '') => version[url] ? `${attr}="${url}?v=${version[url]}${frag}"` : m);

// ── 2. pages ────────────────────────────────────────────────────
const partial = (name) => {
  const f = `src/partials/${name}.html`;
  if (!existsSync(f)) { errors.push(`missing partial ${name}`); return ''; }
  return read(f);
};
const include = (s, depth = 0) => depth > 5 ? s
  : s.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, n) => include(partial(n), depth + 1));

const lookup = (path, ctx) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx);
const fill = (s, ctx) => s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => {
  const v = lookup(k, ctx);
  return v == null ? m : String(v);
});
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#8377;/g, '₹').replace(/&mdash;/g, '—');

const pages = walk('src/pages').filter((f) => f.endsWith('.html')).map((f) => {
  const rel = relative('src/pages', f).split('\\').join('/').replace(/\.html$/, '');
  const route = rel === 'index' ? '/' : '/' + rel.replace(/\/index$/, '');
  return { src: f, out: join(DIST, rel + '.html'), route };
});
const routes = new Set(pages.map((p) => p.route));

function seoTags(html, page) {
  const title = unesc((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || site.name).trim();
  const desc = unesc((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const ogMeta = html.match(/<meta name="ebp:og-image" content="([^"]*)">\s*/);
  const og = ogMeta ? ogMeta[1] : site.ogImage;
  const ogAbs = og.startsWith('http') ? og : site.url + og;
  const canonical = site.url + (page.route === '/' ? '/' : page.route);
  const t = [
    page.route === '/404' ? '' : `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:locale" content="en_IN">`,
    `<meta property="og:title" content="${esc(title)}">`,
    desc && `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${ogAbs}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    desc && `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${ogAbs}">`,
  ].filter(Boolean).join('\n  ');
  return { tags: t, stripOg: ogMeta ? ogMeta[0] : null };
}

function analyticsTags() {
  const out = [];
  if (site.analytics?.vercel) {
    out.push('<script defer src="/_vercel/insights/script.js"></script>');
    out.push('<script defer src="/_vercel/speed-insights/script.js"></script>');
  }
  if (site.analytics?.ga4) out.push(`<meta name="ebp:ga4" content="${esc(site.analytics.ga4)}">`);
  if (site.leads?.endpoint) out.push(`<meta name="ebp:lead-endpoint" content="${esc(site.leads.endpoint)}">`);
  out.push(`<meta name="ebp:email" content="${esc(site.email)}">`);
  return out.join('\n  ');
}

const built = {};
for (const page of pages) {
  let html = include(read(page.src));
  html = fill(html, { site, social: site.social, page: { route: page.route } });

  // links whose href ended up empty (e.g. a social profile not set yet) are dropped
  html = html.replace(/<a\b[^>]*\bhref="(?:tel:|mailto:)?"[^>]*>[\s\S]*?<\/a>\s*/g, '');

  const { tags, stripOg } = seoTags(html, page);
  if (stripOg) html = html.replace(stripOg, '');
  html = html.replace('<!-- @seo -->', tags).replace('<!-- @analytics -->', analyticsTags());
  if (CDN) html = html.replace('<!-- @cdn -->', `<link rel="preconnect" href="${CDN}">`);

  // internal comments never ship
  html = html.replace(/<!--(?!\[if)[\s\S]*?-->\s*/g, '');
  // drafting notes in legal pages never ship
  html = html.replace(/<p class="lg-note">([\s\S]*?)<\/p>/g, (_, body) => {
    openItems.push(`${page.route}: ${unesc(body.replace(/<[^>]+>/g, '')).trim()}`);
    return '';
  });

  html = stamp(rewriteImages(html));
  html = html.replace(/\n{3,}/g, '\n\n');
  write(page.out, html);
  built[page.route] = html;
}

// icon sprite: ship only the symbols some page actually uses
{
  const used = new Set(Object.values(built).flatMap((h) => [...h.matchAll(/icons\.svg[^"#]*#([\w-]+)/g)].map((m) => m[1])));
  const sprite = read('src/assets/icons.svg').replace(/<symbol id="([\w-]+)">[\s\S]*?<\/symbol>\n?/g,
    (m, id) => (used.has(id) ? m : ''));
  write(join(DIST, 'assets/icons.svg'), sprite);
  const all = (read('src/assets/icons.svg').match(/<symbol /g) || []).length;
  if (used.size < all) warnings.push(`icons.svg: ${all - used.size} unused symbols left out of the build`);
}

// ── 3. sitemap + robots ─────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const indexable = pages.filter((p) => !site.sitemapExclude.includes(p.route)
  && !/<meta name="robots" content="noindex/.test(built[p.route]));
const priority = (r) => r === '/' ? '1.0' : r.startsWith('/courses/') ? '0.9' : r.startsWith('/legal/') ? '0.3' : '0.7';
write(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${site.url}${p.route === '/' ? '/' : p.route}</loc><lastmod>${today}</lastmod><priority>${priority(p.route)}</priority></url>`).join('\n')}
</urlset>
`);
write(join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /checkout

Sitemap: ${site.url}/sitemap.xml
`);

// ── 4. checks ───────────────────────────────────────────────────
const ids = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const page of pages) {
  const html = built[page.route];
  const where = page.route;
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${where}: no <title>`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) warnings.push(`${where}: no meta description`);
  const h1 = (html.match(/<h1\b/g) || []).length;
  if (h1 !== 1) warnings.push(`${where}: ${h1} <h1> elements (want 1)`);
  for (const m of html.matchAll(/<img\b[^>]*>/g))
    if (!/\balt="/.test(m[0])) errors.push(`${where}: <img> without alt: ${m[0].slice(0, 90)}`);
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)) {
    const href = m[1];
    if (href === '#' || href === '') { errors.push(`${where}: dead link href="${href}"`); continue; }
    if (href.startsWith('#')) {
      if (href.length > 1 && !ids(html).has(href.slice(1))) errors.push(`${where}: anchor ${href} not on page`);
      continue;
    }
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const [path, frag] = href.split('?')[0].split('#');
    const target = path.replace(/\/$/, '') || '/';
    const ok = routes.has(target) || existsSync(join(DIST, target));
    if (!ok) errors.push(`${where}: broken link ${href}`);
    else if (frag && built[target] && !ids(built[target]).has(frag)) errors.push(`${where}: ${href} — #${frag} not found`);
  }
}

// ── report ──────────────────────────────────────────────────────
const kb = (f) => (readFileSync(f).length / 1024).toFixed(0) + ' KB';
console.log(`\nBuilt ${pages.length} pages → dist/  (images: ${CDN ? CDN : 'local /assets/img'})`);
for (const p of pages) console.log(`  ${p.route.padEnd(34)} ${kb(p.out)}`);
if (openItems.length) {
  write('reports/open-legal-items.md', `# Open legal items (hidden from the live site)\n\nGenerated by the build from <p class="lg-note"> paragraphs.\n\n${openItems.map((x) => `- ${x}`).join('\n')}\n`);
  console.log(`\n${openItems.length} drafting notes hidden from legal pages → reports/open-legal-items.md`);
}
if (warnings.length) console.log('\nWarnings:\n' + warnings.map((w) => '  ! ' + w).join('\n'));
if (errors.length) {
  const counts = errors.reduce((m, e) => m.set(e, (m.get(e) || 0) + 1), new Map());
  console.error('\nErrors:\n' + [...counts].map(([e, n]) => `  ✗ ${e}${n > 1 ? `  (×${n})` : ''}`).join('\n'));
  process.exit(1);
}
console.log('\n✓ all internal links, anchors and alt text check out\n');
