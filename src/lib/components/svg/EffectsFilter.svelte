<script lang="ts">
  import type { EffectsData } from '../types.js';

  let { compId, effects }: { compId: string; effects: EffectsData } = $props();

  const filterId = $derived('fx-' + compId);

  const needsFilter = $derived(
    effects.drop_shadow?.enabled ||
    effects.inner_shadow?.enabled ||
    effects.blur_glow?.enabled ||
    effects.bevel?.enabled
  );

  // Drop Shadow params
  const dsI = $derived((effects.drop_shadow?.intensity ?? 50) / 100);
  const dsBlur = $derived(2 + dsI * 6);
  const dsOff = $derived(1 + dsI * 4);
  const dsOpacity = $derived(0.3 + dsI * 0.4);

  // Inner Shadow params
  const isI = $derived((effects.inner_shadow?.intensity ?? 50) / 100);
  const isBlur = $derived(1 + isI * 4);
  const isOff = $derived(isI * 2);
  const isOpacity = $derived(0.4 + isI * 0.4);

  // Blur/Glow params
  const bgI = $derived((effects.blur_glow?.intensity ?? 30) / 100);
  const bgBlur = $derived(1 + bgI * 6);

  // Bevel params
  const bvI = $derived((effects.bevel?.intensity ?? 50) / 100);
  const bvOff = $derived(0.5 + bvI * 1.5);
  const bvBlur = $derived(0.5 + bvI * 1);
  const bvLightOpacity = $derived(0.15 + bvI * 0.2);
  const bvDarkOpacity = $derived(0.2 + bvI * 0.3);

  // Track last result for chaining
  // We use a simple approach: each enabled effect produces its named result,
  // and the next effect chains from that. Since SVG filter primitives execute
  // in document order and reference by `in`, we just need consistent naming.
</script>

{#if needsFilter}
  <filter id={filterId}
          x="-30%" y="-30%" width="160%" height="160%"
          color-interpolation-filters="sRGB">

    {#if effects.drop_shadow?.enabled}
      <feDropShadow dx={dsOff} dy={dsOff}
                    stdDeviation={dsBlur}
                    flood-color="#000"
                    flood-opacity={dsOpacity}
                    in="SourceGraphic"
                    result="dropShadow" />
    {/if}

    {#if effects.inner_shadow?.enabled}
      {@const prevResult = effects.drop_shadow?.enabled ? 'dropShadow' : 'SourceGraphic'}
      <feComponentTransfer in="SourceAlpha" result="isInvert">
        <feFuncA type="table" tableValues="1 0" />
      </feComponentTransfer>
      <feGaussianBlur in="isInvert" stdDeviation={isBlur} result="isBlur" />
      <feOffset in="isBlur" dx={isOff} dy={isOff} result="isOffset" />
      <feFlood flood-color="#000" flood-opacity={isOpacity} result="isFlood" />
      <feComposite in="isFlood" in2="isOffset" operator="in" result="isComp" />
      <feComposite in="isComp" in2={prevResult} operator="over" result="innerShadow" />
    {/if}

    {#if effects.blur_glow?.enabled}
      {@const prevResult = effects.inner_shadow?.enabled ? 'innerShadow' : (effects.drop_shadow?.enabled ? 'dropShadow' : 'SourceGraphic')}
      <feGaussianBlur in="SourceGraphic" stdDeviation={bgBlur} result="bgBlur" />
      <feMerge result="blurGlow">
        <feMergeNode in="bgBlur" />
        <feMergeNode in={prevResult} />
      </feMerge>
    {/if}

    {#if effects.bevel?.enabled}
      {@const prevResult = effects.blur_glow?.enabled ? 'blurGlow' : (effects.inner_shadow?.enabled ? 'innerShadow' : (effects.drop_shadow?.enabled ? 'dropShadow' : 'SourceGraphic'))}
      <feOffset in="SourceAlpha" dx={-bvOff} dy={-bvOff} result="bvLightOff" />
      <feGaussianBlur in="bvLightOff" stdDeviation={bvBlur} result="bvLightBlur" />
      <feFlood flood-color="#fff" flood-opacity={bvLightOpacity} result="bvLightFlood" />
      <feComposite in="bvLightFlood" in2="bvLightBlur" operator="in" result="bvLight" />
      <feOffset in="SourceAlpha" dx={bvOff} dy={bvOff} result="bvDarkOff" />
      <feGaussianBlur in="bvDarkOff" stdDeviation={bvBlur} result="bvDarkBlur" />
      <feFlood flood-color="#000" flood-opacity={bvDarkOpacity} result="bvDarkFlood" />
      <feComposite in="bvDarkFlood" in2="bvDarkBlur" operator="in" result="bvDark" />
      <feMerge result="bevel">
        <feMergeNode in="bvDark" />
        <feMergeNode in={prevResult} />
        <feMergeNode in="bvLight" />
      </feMerge>
    {/if}
  </filter>
{/if}
