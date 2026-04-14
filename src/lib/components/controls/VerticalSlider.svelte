<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const labelH = $derived(data.label ? 14 : 0);
  const trackW = $derived(Math.max(2, data.width * 0.15));
  const trackX = $derived(data.width / 2 - trackW / 2);
  const trackH = $derived(data.height - labelH);
  const thumbH = $derived(Math.max(4, trackH * 0.08));
  const thumbW = $derived(Math.min(data.width, trackW * 4));
  const pct = 0.5;
  const fillH = $derived(trackH * pct);
  const thumbY = $derived(trackH * (1 - pct) - thumbH / 2);
</script>

<g role="slider"
   aria-label="{data.label || 'Vertical slider'}"
   aria-orientation="vertical"
   aria-valuenow="50"
   aria-valuemin="0"
   aria-valuemax="100">
  <rect x={trackX} y="0" width={trackW} height={trackH} rx={trackW / 2} style="fill: var(--component-bg-alt);" />
  <rect x={trackX} y={trackH - fillH} width={trackW} height={fillH}
        rx={trackW / 2} fill={data.color} fill-opacity="0.5" />
  <rect x={data.width / 2 - thumbW / 2} y={thumbY} width={thumbW} height={thumbH}
        rx="2" style="fill: var(--key-white);" stroke={data.color} stroke-width="1.5" />
  {#if data.label}
    <text x={data.width / 2} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
  {/if}
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
