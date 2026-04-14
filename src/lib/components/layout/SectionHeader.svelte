<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const fs = $derived((data.properties.fontSize as number) || 12);
  const align = $derived((data.properties.align as string) || 'left');
  const tx = $derived(align === 'left' ? 0 : align === 'right' ? data.width : data.width / 2);
  const anchor = $derived(align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle');
</script>

<g>
  <text x={tx} y={fs} fill={data.color} font-size={fs}
        text-anchor={anchor}
        font-weight="bold" font-family="system-ui, sans-serif"
        letter-spacing="1">{data.label}</text>
  <line x1="0" y1={fs + 4} x2={data.width} y2={fs + 4}
        stroke={data.color} stroke-width="0.5" stroke-opacity="0.4" />
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
