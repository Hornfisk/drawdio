<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { newProject, save, saveAs } from '../io/serialization.js';
  import { exportPNG, exportSVG, copyJSONToClipboard } from '../io/export.js';

  let fileMenuOpen = $state(false);
  let exportMenuOpen = $state(false);

  function closeMenus() {
    fileMenuOpen = false;
    exportMenuOpen = false;
  }

  function toggleFile(e: MouseEvent) {
    e.stopPropagation();
    exportMenuOpen = false;
    fileMenuOpen = !fileMenuOpen;
  }

  function toggleExport(e: MouseEvent) {
    e.stopPropagation();
    fileMenuOpen = false;
    exportMenuOpen = !exportMenuOpen;
  }

  // Close menus on outside click
  $effect(() => {
    const handler = () => closeMenus();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  });
</script>

<div id="toolbar">
  <span class="logo">DRAWDIO</span>
  <div class="toolbar-separator"></div>

  <!-- File dropdown -->
  <div class="toolbar-dropdown">
    <button class="toolbar-btn" onclick={toggleFile}>File</button>
    {#if fileMenuOpen}
      <div class="toolbar-dropdown-menu open" onclick={(e: MouseEvent) => e.stopPropagation()}>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); newProject(); }}>
          <span>New</span>
        </div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); document.getElementById('file-input')?.click(); }}>
          <span>Open...</span><span class="toolbar-dropdown-shortcut">Ctrl+O</span>
        </div>
        <div class="toolbar-dropdown-sep"></div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); save(); }}>
          <span>Save</span><span class="toolbar-dropdown-shortcut">Ctrl+S</span>
        </div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); saveAs(); }}>
          <span>Save As...</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Export dropdown -->
  <div class="toolbar-dropdown">
    <button class="toolbar-btn" onclick={toggleExport}>Export</button>
    {#if exportMenuOpen}
      <div class="toolbar-dropdown-menu open" onclick={(e: MouseEvent) => e.stopPropagation()}>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); exportPNG(1); }}>
          <span>PNG 1x</span><span class="toolbar-dropdown-shortcut">Ctrl+E</span>
        </div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); exportPNG(2); }}>
          <span>PNG 2x</span>
        </div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); exportPNG(3); }}>
          <span>PNG 3x</span>
        </div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); exportPNG(1, true); }}>
          <span>PNG Transparent</span>
        </div>
        <div class="toolbar-dropdown-sep"></div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); exportSVG(); }}>
          <span>SVG</span><span class="toolbar-dropdown-shortcut">Ctrl+Shift+E</span>
        </div>
        <div class="toolbar-dropdown-sep"></div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); save(); }}>
          <span>JSON File</span>
        </div>
        <div class="toolbar-dropdown-item" onclick={() => { closeMenus(); copyJSONToClipboard(); }}>
          <span>JSON to Clipboard</span><span class="toolbar-dropdown-shortcut">Ctrl+Shift+C</span>
        </div>
      </div>
    {/if}
  </div>

  <div class="toolbar-separator"></div>

  <!-- Canvas preset -->
  <select
    class="toolbar-select"
    onchange={(e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val !== 'custom') {
        const [w, h] = val.split(',').map(Number);
        appState.canvasWidth = w;
        appState.canvasHeight = h;
      }
    }}
  >
    <option value="900,600">Full Synth (900x600)</option>
    <option value="400,300">Compact Effect (400x300)</option>
    <option value="600,300">Wide Effect (600x300)</option>
    <option value="200,500">Channel Strip (200x500)</option>
    <option value="custom">Custom...</option>
  </select>
  <span class="toolbar-info">{appState.canvasWidth} x {appState.canvasHeight}</span>

  <div class="toolbar-right">
    <span class="autosave-dot"></span>
    <button
      class="toolbar-btn"
      class:active={appState.tooltipsEnabled}
      onclick={() => appState.tooltipsEnabled = !appState.tooltipsEnabled}
    >Tips</button>
    <button
      class="toolbar-btn"
      class:active={appState.snapEnabled}
      onclick={() => appState.snapEnabled = !appState.snapEnabled}
    >Snap</button>
    <button
      class="toolbar-btn"
      class:active={appState.gridVisible}
      onclick={() => appState.gridVisible = !appState.gridVisible}
    >Grid</button>
  </div>
</div>
