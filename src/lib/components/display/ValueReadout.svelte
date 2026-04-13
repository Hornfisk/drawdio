<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const fs = $derived((data.properties.fontSize as number) || 13);
  const displayText = $derived(
    ((data.properties.value as string) || '0') +
    (data.properties.unit ? ' ' + data.properties.unit : '')
  );
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" fill="#111" stroke="#333" stroke-width="0.5" />
  <text x={data.width / 2} y={data.height / 2 + fs * 0.35}
        text-anchor="middle" fill={data.color}
        font-size={fs} font-family="monospace">{displayText}</text>
</g>
