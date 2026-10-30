// Mechanical health check for the kb: what a script can find exactly, for free.
// Missing frontmatter, unsigned added pages, links that go nowhere, orphan pages, stale pages,
// and tickets.json pointing at tickets no page can reach. Exit 1 on any error; stale is a warning.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/routes', import.meta.url).pathname;
const STALE_AFTER_DAYS = 180; // same as src/lib/kb/staleness.ts
const REQUIRED = ['title', 'owner', 'status', 'reviewed'];
// Pages that came with the export; any other page was added and must be signed (README).
const EXPORTED = new Set(['/kb', '/kb/triage/dedupe', '/kb/incidents/4471', '/kb/decisions/0001-dedupe-by-subject']);

const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
const pages = files(ROOT)
  .filter((f) => f.endsWith('+page.svx'))
  .map((f) => {
    const src = readFileSync(f, 'utf8');
    const fm = Object.fromEntries(
      (src.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n').map((l) => [l.split(':')[0].trim(), l.slice(l.indexOf(':') + 1).trim()]),
    );
    const route = '/' + relative(ROOT, f).replace(/\/?\+page\.svx$/, '');
    const links = [...src.matchAll(/\]\((\/kb[^)\s#]*)\)/g)].map((m) => m[1]);
    return { route, fm, src, links };
  });

const errors = [];
const warnings = [];
const routes = new Set(pages.map((p) => p.route));
const inbound = new Map([...routes].map((r) => [r, 0]));

for (const p of pages) {
  for (const k of REQUIRED) if (!p.fm[k]) errors.push(`${p.route}: frontmatter has no ${k}`);
  if (!EXPORTED.has(p.route)) {
    if (!p.fm.signature) errors.push(`${p.route}: added page has no signature`);
    if (!p.src.trimEnd().endsWith('<RenderStamp {signature} />')) errors.push(`${p.route}: added page does not end with <RenderStamp {signature} />`);
  }
  for (const l of p.links) {
    if (!routes.has(l)) errors.push(`${p.route}: link to ${l} goes nowhere`);
    else if (l !== p.route) inbound.set(l, inbound.get(l) + 1);
  }
  const age = Math.floor((Date.now() - new Date(p.fm.reviewed).getTime()) / 86_400_000);
  if (age > STALE_AFTER_DAYS) warnings.push(`${p.route}: stale, reviewed ${p.fm.reviewed} (${age} days)`);
}
// The index lists every page, so a page counts as an orphan only when no other page links to it.
for (const [r, n] of inbound) if (n === 0 && r !== '/kb') errors.push(`${r}: orphan, no page links to it`);

// Every ticket a big ticket was split into must be named on that ticket's incident page.
const tickets = JSON.parse(readFileSync(new URL('../src/lib/data/tickets.json', import.meta.url), 'utf8'));
for (const [from, causes] of Object.entries(tickets)) {
  const incident = pages.find((p) => p.route === `/kb/incidents/${from}`);
  if (!incident) errors.push(`tickets.json: #${from} has no incident page`);
  else if (!/<CauseTable ticket=\{\d+\} \/>/.test(incident.src)) errors.push(`/kb/incidents/${from}: does not render CauseTable, so its tickets are not shown`);
  for (const [cause, url] of Object.entries(causes))
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(url)) errors.push(`tickets.json: #${from} ${cause} is not an issue URL`);
}

for (const w of warnings) console.log('warn ', w);
for (const e of errors) console.log('error', e);
console.log(`${pages.length} pages · ${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
