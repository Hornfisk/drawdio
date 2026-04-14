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
  <div class="left-panel" style="width: {leftPanelWidth}px;">
    <Palette />
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="panel-resize-handle" role="separator" aria-label="Resize panel"
         onmousedown={onResizeMouseDown}></div>
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
