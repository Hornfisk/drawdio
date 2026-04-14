<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const r = $derived(Math.min(data.width, data.height) / 2);
  const isOn = $derived(data.properties.on as boolean);
</script>

<g role="status"
   aria-label="{data.label || 'LED indicator'}"
   aria-live="polite">
  <circle cx={r} cy={r} r={r}
          fill={data.color}
          fill-opacity={isOn ? 0.9 : 0.15}
          stroke={data.color} stroke-width="0.5" stroke-opacity="0.5" />
  {#if isOn}
    <circle cx={r - r * 0.2} cy={r - r * 0.2} r={r * 0.3}
            fill="#fff" fill-opacity="0.3" />
  {/if}
</g>
