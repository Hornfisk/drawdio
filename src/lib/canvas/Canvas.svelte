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
  import { eyedropperState, cancelPick, completePick } from '../ui/eyedropper.svelte.js';
  import InlineTextEditor from './InlineTextEditor.svelte';
  import { inlineEdit } from '../ui/inline-edit.svelte.js';

  let svgEl: SVGSVGElement | undefined = $state();
  let containerEl: HTMLDivElement | undefined = $state();
  let dragOver = $state(false);
  let pickImageData: ImageData | null = null;
  let pickCanvasSize = { w: 0, h: 0 };

  function rasterizeSvg(): Promise<void> {
    return new Promise((resolve, reject) => {
      const svgMarkup = new XMLSerializer().serializeToString(svgEl!);
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const w = appState.canvasWidth;
        const h = appState.canvasHeight;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no 2d ctx')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          pickImageData = ctx.getImageData(0, 0, w, h);
          pickCanvasSize = { w, h };
        } catch (err) {
          URL.revokeObjectURL(url); reject(err); return;
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function sampleAt(clientX: number, clientY: number): string | null {
    if (!pickImageData) return null;
    const rect = svgEl!.getBoundingClientRect();
    // The rasterized SVG baked in the current viewBox, so the canvas (canvasWidth×canvasHeight)
    // already maps 1:1 to what the user sees. Direct proportional mapping.
    const px = Math.floor(((clientX - rect.left) / rect.width) * pickCanvasSize.w);
    const py = Math.floor(((clientY - rect.top) / rect.height) * pickCanvasSize.h);
    if (px < 0 || py < 0 || px >= pickCanvasSize.w || py >= pickCanvasSize.h) return null;
    const i = (py * pickCanvasSize.w + px) * 4;
    const r = pickImageData.data[i];
    const g = pickImageData.data[i + 1];
    const b = pickImageData.data[i + 2];
    return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
  }

  function onPickDown(e: PointerEvent) {
    if (!eyedropperState.active) return;
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) { // right/middle → cancel
      pickImageData = null;
      cancelPick();
      return;
    }
    const hex = sampleAt(e.clientX, e.clientY);
    pickImageData = null;
    if (hex) completePick(hex); else cancelPick();
  }

  function onPickKey(e: KeyboardEvent) {
    if (!eyedropperState.active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      pickImageData = null;
      cancelPick();
    }
  }

  $effect(() => {
    if (eyedropperState.active) {
      // Rasterize once when entering pick mode.
      rasterizeSvg().catch(() => { cancelPick(); });
    }
  });

  const viewBox = $derived(
    `${appState.panX} ${appState.panY} ${appState.canvasWidth / appState.zoom} ${appState.canvasHeight / appState.zoom}`
  );

  onMount(() => {
    const cleanup = initDrag(svgEl!, containerEl!);
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

<svelte:window onkeydown={onPickKey} />
<div class="canvas-container" bind:this={containerEl}
     role="application" aria-label="Design canvas"
     tabindex="-1"
     class:ref-drag-over={dragOver}
     class:picking={eyedropperState.active}
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

  {#if inlineEdit.componentId && svgEl && containerEl}
    <InlineTextEditor {svgEl} {containerEl} />
  {/if}

  {#if eyedropperState.active}
    <div class="pick-overlay"
         role="presentation"
         onpointerdown={onPickDown}
         oncontextmenu={(e) => { e.preventDefault(); cancelPick(); pickImageData = null; }}></div>
  {/if}
</div>
