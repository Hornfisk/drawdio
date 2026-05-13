<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const fsBase = $derived((data.properties.fontSize as number) || 13);
  const cr = $derived((data.properties.cornerRadius as number) ?? 3);
  const ff = $derived((data.properties.fontFamily as string) || 'monospace');
  const align = $derived((data.properties.align as string) || 'center');
  const bgColor = $derived((data.properties.bgColor as string) || '#111');
  const pad = 6;
  const tx = $derived(align === 'left' ? pad : align === 'right' ? data.width - pad : data.width / 2);
  const anchor = $derived(align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle');
  const displayText = $derived(
    ((data.properties.value as string) || '0') +
    (data.properties.unit ? ' ' + data.properties.unit : '')
  );
  const charCount = $derived(Math.max(1, displayText.length));
  // Scale value text down to fit when the box is smaller than the configured fontSize.
  // Cap at fsBase so the user can still control "intended" size.
  const fs = $derived(Math.min(fsBase, data.height * 0.7, (data.width - pad * 2) / charCount * 1.8));

  // LED mode: realistic 7-segment look. Ghost-segment layer + bloom filter.
  const isLED = $derived(ff.includes('DSEG7'));
  // Ghost text: replace alphanumeric with '8' (all segments lit), keep decimals/spaces.
  const ghostText = $derived(displayText.replace(/[a-zA-Z0-9]/g, '8'));
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={cr} fill={bgColor} stroke="#333" stroke-width="0.5" />
  {#if isLED}
    <!-- Ghost segments: all segments faintly visible at very low opacity, mimicking Niner. -->
    <text x={tx} y={data.height / 2}
          text-anchor={anchor} dominant-baseline="central" fill={data.color}
          fill-opacity="0.08"
          font-size={fs} style="font-family: {ff}">{ghostText}</text>
    <!-- Lit value with subtle bloom (drop-shadow filter renders in modern browsers). -->
    <text x={tx} y={data.height / 2}
          text-anchor={anchor} dominant-baseline="central" fill={data.color}
          font-size={fs}
          style="font-family: {ff}; filter: drop-shadow(0 0 3px {data.color});">{displayText}</text>
  {:else}
    <text x={tx} y={data.height / 2}
          text-anchor={anchor} dominant-baseline="central" fill={data.color}
          font-size={fs} style="font-family: {ff}">{displayText}</text>
  {/if}
</g>
