<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const labelH = $derived(data.label ? 14 : 0);
  const pillW = $derived(data.width);
  const pillH = $derived(Math.max(8, data.height - labelH));
  const r = $derived(pillH / 2);
  const isOn = $derived(data.properties.default as boolean);
  const thumbR = $derived(Math.max(2, r - 3));
  const thumbX = $derived(isOn ? pillW - r : r);
</script>

<g role="switch"
   aria-label="{data.label || 'Toggle'}"
   aria-checked={isOn}>
  <rect x="0" y="0" width={pillW} height={pillH} rx={r}
        style="fill: {isOn ? data.color : 'var(--component-bg-alt)'};"
        fill-opacity={isOn ? 0.4 : 1}
        stroke={data.color} stroke-width="1" />
  <circle cx={thumbX} cy={r} r={thumbR}
          style="fill: {isOn ? data.color : 'var(--component-label)'};" />
  {#if data.label}
    <text x={pillW / 2} y={data.height - 2} text-anchor="middle" style="fill: var(--component-label);"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
  {/if}
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
