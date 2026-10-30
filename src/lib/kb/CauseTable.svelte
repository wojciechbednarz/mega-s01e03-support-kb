<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import tickets from '#lib/data/tickets.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { splitTicket, type ProblemRow } from '#lib/kb/split';

  let { ticket }: { ticket: number } = $props();

  // Where each problem in this ticket is tracked now (tickets.json): a pointer, never a copied status.
  const filed = $derived((tickets as Record<string, Record<string, string>>)[String(ticket)] ?? {});
  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const groups = $derived(splitTicket(merged, ticket, tenantOf, notes.oneDayMove, notes.noDate));
  const tags = (g: { taggedAs: Record<string, number> }) =>
    Object.entries(g.taggedAs)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
  const issueNo = (url: string) => '#' + url.split('/').pop();
  const filedAs = (g: ProblemRow) => filed[g.problem];
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'cause' : 'causes'}
</p>

<table>
  <thead>
    <tr><th>cause</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      {@const url = filedAs(g)}
      <tr class:wrong={!url && g.problem !== 'nodate'}>
        <td><code>{g.problem}</code></td>
        <td>{g.reports.length}</td>
        <td class="tags">{tags(g)}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if url}<a href={url}>{issueNo(url)}</a>{:else}{g.problem === 'nodate' ? 'no ticket: no date in the report' : 'no ticket of its own'}{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="note">
  <code>move</code> = the reports the desk read as a one-day move (<code>desk-notes.json</code>). They were filed under
  <code>parser</code> by tenant; their bodies show a one-day shift, not a swap, so they get a row of their own.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .wrong td { background: var(--warn-bg); }
  .wrong td:last-child { color: var(--warn); font-weight: 600; }
</style>
