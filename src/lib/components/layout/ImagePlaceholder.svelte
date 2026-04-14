<script lang="ts">
  import type { ComponentData } from '../types.js';
  let { data }: { data: ComponentData } = $props();

  const imageDataUrl = $derived(data.properties.imageDataUrl as string | undefined);
  const imageName    = $derived(data.properties.imageName as string | undefined);
</script>

<g>
  {#if imageDataUrl}
    <!-- Render embedded user asset -->
    <image href={imageDataUrl} x="0" y="0"
           width={data.width} height={data.height}
           preserveAspectRatio="xMidYMid meet" />
    <!-- Subtle border to show bounds -->
    <rect x="0" y="0" width={data.width} height={data.height}
          rx="2" fill="none" stroke={data.color} stroke-width="0.5" stroke-opacity="0.4"/>
  {:else}
    <!-- Empty placeholder: dashed outline + cross + label -->
    <rect x="0" y="0" width={data.width} height={data.height}
          rx="2" fill="none" stroke={data.color} stroke-width="1"
          stroke-dasharray="4,4" />
    <line x1="0" y1="0" x2={data.width} y2={data.height}
          stroke={data.color} stroke-width="0.5" stroke-opacity="0.3" />
    <line x1={data.width} y1="0" x2="0" y2={data.height}
          stroke={data.color} stroke-width="0.5" stroke-opacity="0.3" />
    <text x={data.width / 2} y={data.height / 2 + 4} text-anchor="middle"
          fill={data.color} font-size="11" font-family="system-ui, sans-serif">
      {imageName || data.label}
    </text>
  {/if}
</g>
