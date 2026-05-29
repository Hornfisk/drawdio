<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const fsBase = $derived((data.properties.fontSize as number) || 14);
  const charCount = $derived(Math.max(1, (data.label || '').length));
  // Scale: cap at the configured fontSize, never overflow the box (account for label length).
  const fs = $derived(Math.min(fsBase, data.height * 0.85, (data.width / charCount) * 1.8));
  const fw = $derived((data.properties.bold as boolean) ? 'bold' : 'normal');
  const fst = $derived((data.properties.italic as boolean) ? 'italic' : 'normal');
  const ff = $derived((data.properties.fontFamily as string) || 'system-ui, sans-serif');
  const align = $derived((data.properties.align as string) || 'left');
  const tx = $derived(align === 'left' ? 0 : align === 'right' ? data.width : data.width / 2);
  const anchor = $derived(align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle');
</script>

<g>
  <text x={tx} y={data.height / 2}
        text-anchor={anchor} dominant-baseline="central"
        fill={data.color} font-size={fs}
        font-weight={fw} font-style={fst} font-family={ff}>{data.label}</text>
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
