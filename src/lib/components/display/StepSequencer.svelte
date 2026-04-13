<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const rows = $derived((data.properties.rows as number) || 1);
  const cols = $derived((data.properties.columns as number) || 16);
  const cs = $derived((data.properties.cellSize as number) || 24);
  const gap = 2;
  const pattern = $derived(((data.properties.pattern as string) || '').split(','));
</script>

<g>
  {#each Array(rows) as _, row}
    {#each Array(cols) as _, col}
      {@const key = row + '_' + col}
      {@const active = pattern.includes(key)}
      {@const cx = col * (cs + gap)}
      {@const cy = row * (cs + gap)}
      <rect x={cx} y={cy} width={cs} height={cs} rx="2"
            fill={active ? ((data.properties.activeColor as string) || data.color) : '#1a1a2a'}
            stroke={active ? data.color : '#333'}
            stroke-width="0.5"
            data-cell={key} />
    {/each}
  {/each}
</g>
