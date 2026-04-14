<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from './lib/canvas/Canvas.svelte';
  import Palette from './lib/panels/Palette.svelte';
  import PropertiesPanel from './lib/panels/PropertiesPanel.svelte';
  import LayersPanel from './lib/panels/LayersPanel.svelte';
  import ContextMenu from './lib/ui/ContextMenu.svelte';
  import Toast from './lib/ui/Toast.svelte';
  import ShortcutsHelp from './lib/ui/ShortcutsHelp.svelte';
  import Toolbar from './lib/toolbar/Toolbar.svelte';
  import { initShortcuts } from './lib/interaction/shortcuts.js';
  import { checkAutoSave, startAutoSave } from './lib/io/autosave.js';
  import { loadFromFile } from './lib/io/serialization.js';
  import { appState } from './lib/state/app.svelte.js';

  // Keep CSS variables + color-scheme in sync with appState
  $effect(() => {
    const root = document.documentElement;
    root.dataset.theme = appState.theme;
    root.style.colorScheme = appState.theme;
    root.style.setProperty('--accent', appState.accentColor);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', appState.theme);
  });

  let leftPanelWidth = $state(180);
  let leftPanelVisible = $state(true);
  let rightPanelVisible = $state(true);
  const LEFT_MIN = 120;
  const LEFT_MAX = 400;

  function onResizeMouseDown(e: MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftPanelWidth;

    function onMove(me: MouseEvent) {
      leftPanelWidth = Math.min(LEFT_MAX, Math.max(LEFT_MIN, startW + me.clientX - startX));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  onMount(() => {
    const cleanupShortcuts = initShortcuts();
    const cleanupAutoSave = startAutoSave();
    checkAutoSave();
    return () => { cleanupShortcuts(); cleanupAutoSave(); };
  });
</script>

<Toolbar />

<!-- App body -->
<div id="app-layout">
  <!-- Left panel (palette) -->
  {#if leftPanelVisible}
    <div class="left-panel" style="width: {leftPanelWidth}px;">
      <div class="panel-header">
        <button class="panel-toggle-btn" title="Hide left panel"
                aria-label="Hide left panel"
                onclick={() => leftPanelVisible = false}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <rect x="4" y="5" width="4" height="10" rx="1" ry="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <Palette />
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div class="panel-resize-handle" role="separator" aria-label="Resize panel"
           onmousedown={onResizeMouseDown}></div>
    </div>
  {:else}
    <button class="panel-reopen left" title="Show left panel"
            aria-label="Show left panel"
            onclick={() => leftPanelVisible = true}>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <rect x="4" y="5" width="4" height="10" rx="1" ry="1" fill="currentColor"/>
      </svg>
    </button>
  {/if}

  <!-- Canvas -->
  <Canvas />

  <!-- Right panel (properties + layers) -->
  {#if rightPanelVisible}
    <div class="right-panel">
      <div class="panel-header right">
        <button class="panel-toggle-btn" title="Hide right panel"
                aria-label="Hide right panel"
                onclick={() => rightPanelVisible = false}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <rect x="12" y="5" width="4" height="10" rx="1" ry="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div class="properties-panel">
        <PropertiesPanel />
      </div>
      <LayersPanel />
    </div>
  {:else}
    <button class="panel-reopen right" title="Show right panel"
            aria-label="Show right panel"
            onclick={() => rightPanelVisible = true}>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <rect x="2" y="3" width="16" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <rect x="12" y="5" width="4" height="10" rx="1" ry="1" fill="currentColor"/>
      </svg>
    </button>
  {/if}
</div>

<ContextMenu />
<Toast />
<ShortcutsHelp />

<!-- Screen-reader status announcements (populated by toast/export) -->
<div id="app-status" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>

<!-- Hidden file input for Open -->
<input type="file" id="file-input" accept=".json,.drawdio.json" style="display:none"
       onchange={(e) => {
         const input = e.target as HTMLInputElement;
         const file = input.files?.[0];
         if (!file) return;
         loadFromFile(file);
         input.value = '';
       }} />
