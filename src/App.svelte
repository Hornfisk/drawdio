<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from './lib/canvas/Canvas.svelte';
  import Palette from './lib/panels/Palette.svelte';
  import PropertiesPanel from './lib/panels/PropertiesPanel.svelte';
  import LayersPanel from './lib/panels/LayersPanel.svelte';
  import ContextMenu from './lib/ui/ContextMenu.svelte';
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
  <div class="left-panel">
    <Palette />
    <div class="panel-resize-handle"></div>
  </div>

  <!-- Canvas -->
  <Canvas />

  <!-- Right panel (properties + layers) -->
  <div class="right-panel">
    <div class="properties-panel">
      <PropertiesPanel />
    </div>
    <LayersPanel />
  </div>
</div>

<ContextMenu />

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
