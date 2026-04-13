<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const fs = $derived((data.properties.fontSize as number) || 14);
  const fw = $derived((data.properties.bold as boolean) ? 'bold' : 'normal');
  const fst = $derived((data.properties.italic as boolean) ? 'italic' : 'normal');
  const ff = $derived((data.properties.fontFamily as string) || 'system-ui, sans-serif');
</script>

<g>
  <text x="0" y={fs} fill={data.color} font-size={fs}
        font-weight={fw} font-style={fst} font-family={ff}>{data.label}</text>
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
