<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const labelH = $derived(data.label ? 14 : 0);
  const trackArea = $derived(data.height - labelH);
  const trackY = $derived(trackArea / 2);
  const trackH = $derived(Math.max(2, trackArea * 0.15));
  const thumbR = $derived(Math.min(trackArea / 2 - 1, data.width * 0.06, 10));
  const trackWidth = $derived(data.width - thumbR * 2);
  const pct = 0.5;
  const thumbCx = $derived(thumbR + trackWidth * pct);
</script>

<g>
  <!-- Track background -->
  <rect x={thumbR} y={trackY - trackH / 2}
        width={trackWidth} height={trackH}
        rx={trackH / 2} style="fill: var(--component-bg-alt);" />

  <!-- Filled portion -->
  <rect x={thumbR} y={trackY - trackH / 2}
        width={trackWidth * pct} height={trackH}
        rx={trackH / 2} fill={data.color} fill-opacity="0.5" />

  <!-- Thumb -->
  <circle cx={thumbCx} cy={trackY} r={thumbR}
          style="fill: var(--key-white);" stroke={data.color} stroke-width="1.5" />

  <!-- Label -->
  {#if data.label}
    <text x={data.width / 2} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
  {/if}

  <!-- Hit area -->
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
