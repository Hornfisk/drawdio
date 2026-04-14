<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const bars = $derived((data.properties.bars as number) || 24);
  const gap = 2;
  const barW = $derived((data.width - (bars + 1) * gap) / bars);
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" style="fill: var(--component-bg);" stroke="#333" stroke-width="0.5" />
  {#each Array(bars) as _, i}
    {@const h = data.height * (0.3 + 0.5 * Math.abs(Math.sin(i * 0.7 + 0.5)) * Math.cos(i * 0.3))}
    {@const bx = gap + i * (barW + gap)}
    <rect x={bx} y={data.height - h} width={barW} height={h}
          rx="1" fill={data.color} fill-opacity="0.7" />
  {/each}
</g>
