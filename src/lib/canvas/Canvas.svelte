<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '../state/app.svelte.js';
  import { getSortedComponents } from '../state/derived.svelte.js';
  import Grid from './Grid.svelte';
  import ComponentRenderer from '../components/svg/ComponentRenderer.svelte';
  import EffectsFilter from '../components/svg/EffectsFilter.svelte';
  import EffectsDefs from '../components/svg/EffectsDefs.svelte';
  import SelectionHandles from './SelectionHandles.svelte';
  import RubberBand from './RubberBand.svelte';
  import { initDrag } from '../interaction/drag.svelte.js';

  let svgEl: SVGSVGElement;
  let containerEl: HTMLDivElement;

  const viewBox = $derived(
    `${appState.panX} ${appState.panY} ${appState.canvasWidth / appState.zoom} ${appState.canvasHeight / appState.zoom}`
  );

  onMount(() => {
    const cleanup = initDrag(svgEl, containerEl);
    return cleanup;
  });
</script>

<div class="canvas-container" bind:this={containerEl}>
  <svg
    bind:this={svgEl}
    xmlns="http://www.w3.org/2000/svg"
    width={appState.canvasWidth}
    height={appState.canvasHeight}
    viewBox={viewBox}
    style="overflow: visible;"
  >
    <defs>
      <Grid />
      {#each getSortedComponents() as comp (comp.id)}
        <EffectsFilter compId={comp.id} effects={comp.effects} />
        <EffectsDefs data={comp} />
      {/each}
    </defs>

    <!-- Canvas background -->
    <rect
      width={appState.canvasWidth}
      height={appState.canvasHeight}
      fill={appState.bgColor}
    />

    <!-- Grid overlay -->
    <rect
      width={appState.canvasWidth}
      height={appState.canvasHeight}
      fill="url(#grid-pattern)"
      visibility={appState.gridVisible ? 'visible' : 'hidden'}
    />

    <!-- Components layer -->
    <g id="components-layer">
      {#each getSortedComponents() as comp (comp.id)}
        {#if comp.visible !== false}
          <ComponentRenderer data={comp} />
        {/if}
      {/each}
    </g>

    <!-- Selection layer -->
    <g id="selection-layer">
      <SelectionHandles />
      <RubberBand />
    </g>
  </svg>
</div>
