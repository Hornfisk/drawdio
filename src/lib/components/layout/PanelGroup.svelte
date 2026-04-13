<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const cr = $derived((data.properties.cornerRadius as number) || 6);
  const bw = $derived((data.properties.borderWidth as number) || 1);
  const bgFill = $derived((data.properties.bgColor as string) || data.color);
  const bgOpacity = $derived((data.properties.bgOpacity as number) || 0.5);
  const textWidth = $derived(data.label ? data.label.length * 7 + 12 : 0);
</script>

<g>
  <rect x="0" y="0" width={data.width} height={data.height}
        rx={cr} fill={bgFill} fill-opacity={bgOpacity}
        stroke={data.color} stroke-width={bw} />
  {#if data.label}
    <rect x="10" y="-6" width={textWidth} height="12" fill="#151528" />
    <text x="16" y="4" fill={data.color} font-size="10" fill-opacity="0.7"
          font-family="system-ui, sans-serif">{data.label}</text>
  {/if}
</g>
