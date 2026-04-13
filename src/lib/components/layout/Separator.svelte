<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const isH = $derived((data.properties.orientation as string) !== 'vertical');
  const th = $derived((data.properties.thickness as number) || 1);
</script>

<g>
  {#if isH}
    <line x1="0" y1={data.height / 2} x2={data.width} y2={data.height / 2}
          stroke={data.color} stroke-width={th} />
  {:else}
    <line x1={data.width / 2} y1="0" x2={data.width / 2} y2={data.height}
          stroke={data.color} stroke-width={th} />
  {/if}
  <rect x="0" y="0" width={data.width} height={data.height} fill="transparent" />
</g>
