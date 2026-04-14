<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const isVert = $derived((data.properties.orientation as string) !== 'horizontal');
  const segs = $derived((data.properties.segments as number) || 12);
  const gap = 2;

  function segColor(pct: number): string {
    if (pct < 0.6) return 'var(--meter-green)';
    if (pct < 0.8) return 'var(--meter-yellow)';
    return 'var(--meter-red)';
  }
</script>

<g>
  {#if isVert}
    {#each Array(segs) as _, i}
      {@const segH = (data.height - (segs - 1) * gap) / segs}
      {@const sy = data.height - (i + 1) * (segH + gap) + gap}
      {@const pct = i / segs}
      {@const lit = i < segs * 0.65}
      <rect x="0" y={sy} width={data.width} height={segH}
            rx="1" style="fill: {segColor(pct)};" fill-opacity={lit ? 0.9 : 0.15} />
    {/each}
  {:else}
    {#each Array(segs) as _, i}
      {@const segW = (data.width - (segs - 1) * gap) / segs}
      {@const sx = i * (segW + gap)}
      {@const pct = i / segs}
      {@const lit = i < segs * 0.65}
      <rect x={sx} y="0" width={segW} height={data.height}
            rx="1" style="fill: {segColor(pct)};" fill-opacity={lit ? 0.9 : 0.15} />
    {/each}
  {/if}
</g>
