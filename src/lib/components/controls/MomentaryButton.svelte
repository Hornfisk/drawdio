<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();
  const rx = $derived(data.properties.cornerRadius ?? 4);
</script>

<g role="button"
   aria-label="{data.label || 'Button'}"
   aria-pressed="false">
  <!-- Body -->
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={rx} style="fill: var(--component-bg-alt);" stroke={data.color} stroke-width="1" />

  <!-- Label -->
  <text x={data.width / 2} y={data.height / 2 + 4} text-anchor="middle"
        fill={data.color} font-size="11" font-family="system-ui, sans-serif">{data.label}</text>
</g>
