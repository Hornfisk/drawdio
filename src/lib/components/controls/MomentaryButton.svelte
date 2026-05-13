<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();
  const rx = $derived(data.properties.cornerRadius ?? 4);
  const labelSize = $derived(Math.max(7, Math.min(14, Math.min(data.width * 0.15, data.height * 0.5))));
</script>

<g role="button"
   aria-label="{data.label || 'Button'}"
   aria-pressed="false">
  <!-- Body -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={rx} style="fill: var(--component-bg-alt);" stroke={data.color} stroke-width="1" />

  <!-- Label -->
  <text x={data.width / 2} y={data.height / 2} text-anchor="middle" dominant-baseline="central"
        fill={data.color} font-size={labelSize} font-family="system-ui, sans-serif">{data.label}</text>
</g>
