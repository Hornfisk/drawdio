<script lang="ts">
  import type { ComponentData } from '../types.js';

  let { data }: { data: ComponentData } = $props();

  const fx = $derived(data.effects);
  const w = $derived(data.width);
  const h = $derived(data.height);

  const gradId = $derived('grad-' + data.id);
  const gradOpacity = $derived((fx.gradient_fill?.intensity ?? 50) / 200);

  const texId = $derived('tex-' + data.id);
  const noiseFilterId = $derived('texnoise-' + data.id);
  const woodFilterId = $derived('texwood-' + data.id);
  const texPreset = $derived(fx.texture_fill?.preset ?? 'noise');
  const texOpacity = $derived((fx.texture_fill?.intensity ?? 50) / 200);

  const glossI = $derived((fx.gloss?.intensity ?? 50) / 100);
  const glossH = $derived(h * 0.45);
  const glossOpacity = $derived(0.05 + glossI * 0.12);
</script>

<!-- Gradient fill overlay -->
{#if fx.gradient_fill?.enabled}
  <rect x="0" y="0" width={w} height={h}
        fill="url(#{gradId})"
        fill-opacity={gradOpacity}
        rx="2" pointer-events="none" />
{/if}

<!-- Texture fill overlay -->
{#if fx.texture_fill?.enabled}
  {#if texPreset === 'noise'}
    <rect x="0" y="0" width={w} height={h}
          fill="#808080" fill-opacity={texOpacity}
          filter="url(#{noiseFilterId})"
          rx="2" pointer-events="none" />
  {:else if texPreset === 'wood_grain'}
    <rect x="0" y="0" width={w} height={h}
          fill="#806040" fill-opacity={texOpacity}
          filter="url(#{woodFilterId})"
          rx="2" pointer-events="none" />
  {:else}
    <rect x="0" y="0" width={w} height={h}
          fill="url(#{texId})"
          fill-opacity={texOpacity}
          rx="2" pointer-events="none" />
  {/if}
{/if}

<!-- Gloss overlay -->
{#if fx.gloss?.enabled}
  <ellipse cx={w / 2} cy={glossH * 0.4}
           rx={w * 0.4} ry={glossH * 0.6}
           fill="#fff" fill-opacity={glossOpacity}
           pointer-events="none" />
{/if}
