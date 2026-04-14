<script lang="ts">
  import { onMount } from 'svelte';
  import { appState } from '../state/app.svelte.js';
  import { getSortedComponents } from '../state/derived.svelte.js';
  import { getEntry } from '../components/registry.js';
  import Grid from './Grid.svelte';
  import ComponentRenderer from '../components/svg/ComponentRenderer.svelte';
  import EffectsFilter from '../components/svg/EffectsFilter.svelte';
  import EffectsDefs from '../components/svg/EffectsDefs.svelte';
  import SelectionHandles from './SelectionHandles.svelte';
  import RubberBand from './RubberBand.svelte';
  import { initDrag } from '../interaction/drag.svelte.js';

  let svgEl: SVGSVGElement;
  let containerEl: HTMLDivElement;
  let dragOver = $state(false);

  const viewBox = $derived(
    `${appState.panX} ${appState.panY} ${appState.canvasWidth / appState.zoom} ${appState.canvasHeight / appState.zoom}`
  );

  onMount(() => {
    const cleanup = initDrag(svgEl, containerEl);
    return cleanup;
  });

  function loadRefImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Measure natural dimensions before committing
      const img = new Image();
      img.onload = () => {
        if (appState.components.length > 0) {
          if (!confirm(`Resize canvas to ${img.naturalWidth}×${img.naturalHeight}px? Existing components will remain at their current positions.`)) {
            appState.refImageDataUrl = dataUrl;
            appState.refImageVisible = true;
            appState.isDirty = true;
            return;
          }
        }
        appState.canvasWidth = img.naturalWidth;
        appState.canvasHeight = img.naturalHeight;
        appState.refImageDataUrl = dataUrl;
        appState.refImageVisible = true;
        appState.isDirty = true;
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function onDragOver(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    dragOver = true;
  }

  function onDragLeave() { dragOver = false; }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) loadRefImage(file);
  }
</script>

<div class="canvas-container" bind:this={containerEl}
     role="application" aria-label="Design canvas"
     class:ref-drag-over={dragOver}
     ondragover={onDragOver}
     ondragleave={onDragLeave}
     ondrop={onDrop}>
  {#if appState.placingType}
    {@const entry = getEntry(appState.placingType)}
    <div class="placement-chip" role="status" aria-live="polite">
      Placing: {entry?.displayName ?? appState.placingType}
      <button class="placement-chip-cancel"
              onclick={() => { appState.placingType = null; }}
              title="Cancel placement (Esc)"
              aria-label="Cancel placement">×</button>
    </div>
  {/if}
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

    <!-- Reference image (excluded from exports) -->
    {#if appState.refImageDataUrl && appState.refImageVisible}
      <image id="ref-image"
             href={appState.refImageDataUrl}
             x="0" y="0"
             width={appState.canvasWidth}
             height={appState.canvasHeight}
             opacity={appState.refImageOpacity}
             preserveAspectRatio="xMidYMid slice"
             style="pointer-events: none;" />
    {/if}

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
