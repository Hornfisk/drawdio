<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const displayText = $derived((data.properties.selected as string) || data.label);
  const ax = $derived(data.width - 14);
  const ay = $derived(data.height / 2);
  const chevronD = $derived(`M ${ax - 3} ${ay - 2} L ${ax} ${ay + 2} L ${ax + 3} ${ay - 2}`);
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx="3" fill="#222" stroke="#555" stroke-width="0.5" />
  <text x="8" y={data.height / 2 + 4} fill="#ccc"
        font-size="11" font-family="system-ui, sans-serif">{displayText}</text>
  <path d={chevronD} fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" />
</g>
