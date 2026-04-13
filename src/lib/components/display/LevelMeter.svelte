<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const isVert = $derived((data.properties.orientation as string) !== 'horizontal');
  const segs = $derived((data.properties.segments as number) || 12);
  const gap = 2;

  function segColor(pct: number): string {
    return pct < 0.6 ? '#66bb6a' : pct < 0.8 ? '#ffd54f' : '#ef5350';
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
            rx="1" fill={segColor(pct)} fill-opacity={lit ? 0.9 : 0.15} />
    {/each}
  {:else}
    {#each Array(segs) as _, i}
      {@const segW = (data.width - (segs - 1) * gap) / segs}
      {@const sx = i * (segW + gap)}
      {@const pct = i / segs}
      {@const lit = i < segs * 0.65}
      <rect x={sx} y="0" width={segW} height={data.height}
            rx="1" fill={segColor(pct)} fill-opacity={lit ? 0.9 : 0.15} />
    {/each}
  {/if}
</g>
