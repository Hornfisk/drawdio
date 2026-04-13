<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const w = $derived(data.width);
  const h = $derived(data.height);
</script>

<g>
  <rect x="0" y="0" width={w} height={h} rx="2" fill="#1a1a2a" stroke="#444" stroke-width="0.5" />
  {#each [1, 2, 3] as i}
    <line x1={w * i / 4} y1="0" x2={w * i / 4} y2={h} stroke="#333" stroke-width="0.5" />
    <line x1="0" y1={h * i / 4} x2={w} y2={h * i / 4} stroke="#333" stroke-width="0.5" />
  {/each}
  <line x1={w / 2} y1="0" x2={w / 2} y2={h} stroke={data.color} stroke-width="0.5" stroke-opacity="0.3" />
  <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={data.color} stroke-width="0.5" stroke-opacity="0.3" />
  <circle cx={w / 2} cy={h / 2} r="5" fill={data.color} fill-opacity="0.8" />
  <circle cx={w / 2} cy={h / 2} r="5" fill="none" stroke={data.color} stroke-width="1" stroke-opacity="0.4" />
</g>
