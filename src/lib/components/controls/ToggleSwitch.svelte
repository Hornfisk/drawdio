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

<g>
  <rect x="0" y="0" width={pillW} height={pillH} rx={r}
        fill={isOn ? data.color : '#2a2a3a'}
        fill-opacity={isOn ? 0.4 : 1}
        stroke={data.color} stroke-width="1" />
  <circle cx={thumbX} cy={r} r={thumbR}
          fill={isOn ? data.color : '#888'} />
  {#if data.label}
    <text x={pillW / 2} y={data.height - 2} text-anchor="middle" fill="#aaa"
          font-size="10" font-family="system-ui, sans-serif">{data.label}</text>
  {/if}
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
