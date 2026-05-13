<script lang="ts">
  import { appState } from '../state/app.svelte.js';

  // Zoom-aware grid LOD: keep cells visible at any zoom by doubling the visible step
  // until each grid cell is at least minScreenPx wide on screen. Snap-to-grid keeps
  // using the real appState.gridSize — only the rendered grid coarsens.
  const minScreenPx = 8;
  const visibleStep = $derived.by(() => {
    const target = minScreenPx / Math.max(0.01, appState.zoom);
    let step = appState.gridSize;
    while (step < target) step *= 2;
    return step;
  });
  // When the visible step has been promoted from the raw gridSize, also draw a
  // fainter sub-grid at the real spacing so the snap target is still hinted at
  // close-to-threshold zoom levels (and disappears entirely when way zoomed out).
  const subStep = $derived(appState.gridSize);
  const showSubGrid = $derived(visibleStep > appState.gridSize && appState.gridSize * appState.zoom >= 3);
</script>

<!--
  Brand-aligned crossed-line pattern (mirrors hyperfocusdsp.com body grid).
  Uses --border (slate-surface #2A2D33) for ~1.5:1 contrast on graphite —
  visible without being loud. color-scheme: dark on the page keeps Force Dark
  mode from inverting it.

  vector-effect="non-scaling-stroke" pins line thickness to 1 screen pixel
  regardless of zoom, so the grid stays crisp at any scale.
-->
{#if showSubGrid}
  <pattern id="grid-pattern-sub" width={subStep} height={subStep} patternUnits="userSpaceOnUse">
    <path d="M {subStep} 0 L 0 0 0 {subStep}"
          fill="none"
          style="stroke: var(--border-muted); stroke-width: 1;"
          shape-rendering="crispEdges"
          vector-effect="non-scaling-stroke" />
  </pattern>
{/if}
<pattern id="grid-pattern" width={visibleStep} height={visibleStep} patternUnits="userSpaceOnUse">
  {#if showSubGrid}
    <rect width={visibleStep} height={visibleStep} fill="url(#grid-pattern-sub)" />
  {/if}
  <path d="M {visibleStep} 0 L 0 0 0 {visibleStep}"
        fill="none"
        style="stroke: var(--border); stroke-width: 1;"
        shape-rendering="crispEdges"
        vector-effect="non-scaling-stroke" />
</pattern>
