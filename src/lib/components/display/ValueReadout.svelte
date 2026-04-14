<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const fs = $derived((data.properties.fontSize as number) || 13);
  const cr = $derived((data.properties.cornerRadius as number) ?? 3);
  const ff = $derived((data.properties.fontFamily as string) || 'monospace');
  const align = $derived((data.properties.align as string) || 'center');
  const pad = 6;
  const tx = $derived(align === 'left' ? pad : align === 'right' ? data.width - pad : data.width / 2);
  const anchor = $derived(align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle');
  const displayText = $derived(
    ((data.properties.value as string) || '0') +
    (data.properties.unit ? ' ' + data.properties.unit : '')
  );
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={cr} fill="#111" stroke="#333" stroke-width="0.5" />
  <text x={tx} y={data.height / 2}
        text-anchor={anchor} dominant-baseline="central" fill={data.color}
        font-size={fs} style="font-family: {ff}">{displayText}</text>
</g>
