<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type Problem } from '#lib/kb/split';

  // tickets: where each problem is tracked now, problem → URL.
  let { ticket, tickets, labels }: { ticket: number; tickets: Partial<Record<Problem, string>>; labels: Partial<Record<Problem, string>> } =
    $props();

  const all = reports as Report[];
  const rows = $derived(splitTicket(all, ticket, tenantOf, notes.oneDayMove));
  const merged = $derived(rows.reduce((n, r) => n + r.reports.length, 0));
  const tags = (r: { taggedAs: Record<string, number> }) =>
    Object.entries(r.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
  const issueNo = (url: string) => '#' + url.split('/').pop();
</script>

<p class="sum">
  <strong>{all.length}</strong> exported rows · <strong>{uniqueById(all).length}</strong> unique reports ·
  <strong>{merged}</strong> merged into #{ticket} · <strong>{rows.length}</strong> problems
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each rows as r (r.problem)}
      {@const url = r.problem === 'unplaced' ? undefined : tickets[r.problem]}
      <tr>
        <td>{r.problem === 'unplaced' ? 'unplaced' : (labels[r.problem] ?? r.problem)} <code>{r.problem}</code></td>
        <td>{r.reports.length}</td>
        <td class="tags">{tags(r)}</td>
        <td>{r.tenants}</td>
        <td>{r.firstSeen} → {r.lastSeen}</td>
        <td>{#if url}<a href={url}>{issueNo(url)}</a>{:else}<span class="none">none</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
</style>
