<script lang="ts">
  import type { ComponentData } from '../types.js';

  let { data }: { data: ComponentData } = $props();

  const fx = $derived(data.effects);

  // Gradient defs
  const gradId = $derived('grad-' + data.id);
  const gradAngle = $derived((fx.gradient_fill?.angle ?? 0) * Math.PI / 180);
  const gradX1 = $derived(50 - Math.cos(gradAngle) * 50);
  const gradY1 = $derived(50 - Math.sin(gradAngle) * 50);
  const gradX2 = $derived(50 + Math.cos(gradAngle) * 50);
  const gradY2 = $derived(50 + Math.sin(gradAngle) * 50);

  // Texture defs
  const texId = $derived('tex-' + data.id);
  const noiseFilterId = $derived('texnoise-' + data.id);
  const woodFilterId = $derived('texwood-' + data.id);
  const texPreset = $derived(fx.texture_fill?.preset ?? 'noise');
</script>

{#if fx.gradient_fill?.enabled}
  <linearGradient id={gradId}
                  x1="{gradX1}%" y1="{gradY1}%"
                  x2="{gradX2}%" y2="{gradY2}%">
    <stop offset="0%" stop-color={fx.gradient_fill.startColor || '#ffffff'} />
    <stop offset="100%" stop-color={fx.gradient_fill.endColor || '#000000'} />
  </linearGradient>
{/if}

{#if fx.texture_fill?.enabled}
  {#if texPreset === 'noise'}
    <filter id={noiseFilterId} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
      <feColorMatrix type="saturate" values="0" in="noise" />
    </filter>
  {:else if texPreset === 'carbon'}
    <pattern id={texId} width="6" height="6" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="6" height="6" fill="#1a1a1a" />
      <rect x="0" y="0" width="3" height="3" fill="#222" />
      <rect x="3" y="3" width="3" height="3" fill="#222" />
    </pattern>
  {:else if texPreset === 'brushed_metal'}
    <pattern id={texId} width="200" height="2" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="200" height="1" fill="#888" fill-opacity="0.1" />
      <rect x="0" y="1" width="200" height="1" fill="#444" fill-opacity="0.1" />
    </pattern>
  {:else if texPreset === 'wood_grain'}
    <filter id={woodFilterId} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="2" seed="3" result="wood" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.25  0 0 0 0 0.1  0 0 0 1 0" in="wood" />
    </filter>
  {:else if texPreset === 'diamond_plate'}
    <pattern id={texId} width="12" height="12" patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width="12" height="12" fill="#2a2a2a" />
      <path d="M 6 1 L 11 6 L 6 11 L 1 6 Z" fill="#3a3a3a" stroke="#444" stroke-width="0.3" />
    </pattern>
  {/if}
{/if}
