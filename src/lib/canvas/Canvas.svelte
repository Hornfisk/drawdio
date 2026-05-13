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
  import SnapGuides from './SnapGuides.svelte';
  import WorkspaceHandles from './WorkspaceHandles.svelte';
  import { getActiveWorkspace, renameWorkspace } from '../state/workspaces.js';

  let renameDraft = $state('');
  // Seed the draft from the workspace's current name whenever rename starts.
  // (drag.svelte.ts triggers the rename by setting appState.renamingWorkspaceId.)
  $effect(() => {
    if (appState.renamingWorkspaceId) {
      const ws = appState.workspaces.find(w => w.id === appState.renamingWorkspaceId);
      if (ws) renameDraft = ws.name;
    } else {
      renameDraft = '';
    }
  });
  function commitWorkspaceRename() {
    if (!appState.renamingWorkspaceId) return;
    renameWorkspace(appState.renamingWorkspaceId, renameDraft);
    appState.renamingWorkspaceId = null;
  }
  function cancelWorkspaceRename() {
    appState.renamingWorkspaceId = null;
  }
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

  // Compute the viewBox over the multi-workspace world. The SVG keeps its
  // pixel size locked to the active workspace dims (so the existing layout
  // doesn't reflow), but the viewBox scales to whatever world rect we want
  // visible. Zoom < 1 lets you see neighbouring frames; pan walks among them.
  const viewBox = $derived(
    `${appState.panX} ${appState.panY} ${appState.canvasWidth / appState.zoom} ${appState.canvasHeight / appState.zoom}`
  );

  const activeWs = $derived(getActiveWorkspace());
  // Active workspace position (world coords). Falls back to (0,0) before init.
  const activeWsX = $derived(activeWs?.x ?? 0);
  const activeWsY = $derived(activeWs?.y ?? 0);

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
    width="100%"
    height="100%"
    viewBox={viewBox}
    preserveAspectRatio="xMidYMid meet"
    style="position: absolute; inset: 0; overflow: visible;"
  >
    <defs>
      <Grid />
      <!-- Effects + gradient defs for active workspace's live components -->
      {#each getSortedComponents() as comp (comp.id)}
        <EffectsFilter compId={comp.id} effects={comp.effects} />
        <EffectsDefs data={comp} />
      {/each}
      <!-- Defs for non-active workspace snapshots so their components render correctly -->
      {#each appState.workspaces as ws (ws.id)}
        {#if ws.id !== appState.activeWorkspaceId}
          {#each ws.components as comp (comp.id)}
            <EffectsFilter compId={comp.id} effects={comp.effects} />
            <EffectsDefs data={comp} />
          {/each}
        {/if}
      {/each}
    </defs>

    <!-- All workspaces (frames) rendered side-by-side in world space -->
    {#each appState.workspaces as ws (ws.id)}
      {@const isActive = ws.id === appState.activeWorkspaceId}
      {@const w = isActive ? appState.canvasWidth : ws.canvasWidth}
      {@const h = isActive ? appState.canvasHeight : ws.canvasHeight}
      {@const bg = isActive ? appState.bgColor : ws.bgColor}
      {@const gridOn = isActive ? appState.gridVisible : ws.gridVisible}
      {@const refUrl = isActive ? appState.refImageDataUrl : ws.refImageDataUrl}
      {@const refOpacity = isActive ? appState.refImageOpacity : ws.refImageOpacity}
      {@const refVisible = isActive ? appState.refImageVisible : ws.refImageVisible}

      <g transform="translate({ws.x}, {ws.y})"
         data-workspace-id={ws.id}
         class:workspace-inactive={!isActive}>

        <!-- Frame name label, above the rect — click switches active, drag moves frame,
             double-click switches to an inline editor. -->
        {#if appState.renamingWorkspaceId === ws.id}
          <foreignObject x="0" y="-22"
                         width={Math.max(160, ws.name.length * 9 + 40)}
                         height="20">
            <!-- svelte-ignore a11y_autofocus -->
            <input
              class="ws-header-rename"
              type="text"
              value={renameDraft}
              oninput={(e) => renameDraft = (e.target as HTMLInputElement).value}
              onblur={commitWorkspaceRename}
              onkeydown={(e) => {
                if (e.key === 'Enter') commitWorkspaceRename();
                else if (e.key === 'Escape') cancelWorkspaceRename();
                e.stopPropagation();
              }}
              autofocus
            />
          </foreignObject>
        {:else}
          <g data-workspace-header={ws.id} style="cursor: move;">
            <rect x="0" y="-22"
                  width={Math.min(220, Math.max(80, ws.name.length * 7 + 30))}
                  height="18" rx="3"
                  fill={isActive ? appState.accentColor : 'var(--bg-toolbar)'}
                  fill-opacity={isActive ? 0.85 : 0.7}
                  stroke="var(--border)" stroke-width="1"
                  vector-effect="non-scaling-stroke" />
            <text x="8" y="-9"
                  fill={isActive ? 'var(--on-accent)' : 'var(--text)'}
                  font-size="11" font-family="system-ui"
                  pointer-events="none"
                  style="user-select: none;">{ws.name}</text>
          </g>
        {/if}

        <!-- Workspace background -->
        <rect width={w} height={h}
              fill={bg}
              data-workspace-bg={ws.id} />

        <!-- Reference image (only when present, excluded from exports via id="ref-image" on active) -->
        {#if refUrl && refVisible}
          <image id={isActive ? 'ref-image' : null}
                 href={refUrl}
                 x="0" y="0"
                 width={w} height={h}
                 opacity={refOpacity}
                 preserveAspectRatio="xMidYMid slice"
                 style="pointer-events: none;" />
        {/if}

        <!-- Grid overlay -->
        {#if gridOn}
          <rect width={w} height={h}
                fill="url(#grid-pattern)"
                pointer-events="none" />
        {/if}

        <!-- Components -->
        <g class="components-layer">
          {#if isActive}
            {#each getSortedComponents() as comp (comp.id)}
              {#if comp.visible !== false}
                <ComponentRenderer data={comp} />
              {/if}
            {/each}
          {:else}
            {#each ws.components as comp (comp.id)}
              {#if comp.visible !== false}
                <ComponentRenderer data={comp} />
              {/if}
            {/each}
          {/if}
        </g>

        <!-- Subtle outline so inactive frames don't visually merge with active -->
        {#if !isActive}
          <rect width={w} height={h}
                fill="none"
                stroke="var(--border)" stroke-width="1"
                vector-effect="non-scaling-stroke"
                pointer-events="none" />
        {:else if appState.selectedWorkspaceId === ws.id}
          <!-- Workspace is selected as an entity (Ctrl+C / Delete target). -->
          <rect x="-2" y="-2"
                width={w + 4} height={h + 4}
                fill="none"
                stroke={appState.accentColor} stroke-width="2"
                vector-effect="non-scaling-stroke"
                pointer-events="none" />
        {/if}
      </g>
    {/each}

    <!-- Selection/snap/handle layers — only for the active workspace, translated to its origin -->
    <g transform="translate({activeWsX}, {activeWsY})">
      <g id="snap-guides-layer">
        <SnapGuides />
      </g>
      <g id="selection-layer">
        <SelectionHandles />
        <RubberBand />
        <WorkspaceHandles />
      </g>
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
