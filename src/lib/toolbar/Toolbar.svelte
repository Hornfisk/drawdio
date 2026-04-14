<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { newProject, save, saveAs } from '../io/serialization.js';
  import { exportPNG, exportSVG, copyJSONToClipboard } from '../io/export.js';

  let menuOpen = $state(false);

  // Accent color presets: label + value
  const ACCENT_PRESETS = [
    { label: 'Cyan',    value: '#4fc3f7' },
    { label: 'Orange',  value: '#ff6600' },
    { label: 'Lime',    value: '#a3e635' },
    { label: 'Purple',  value: '#c084fc' },
    { label: 'Pink',    value: '#f472b6' },
    { label: 'Amber',   value: '#f59e0b' },
    { label: 'Red',     value: '#ef5350' },
    { label: 'White',   value: '#e0e0e0' },
  ];

  function closeMenu() { menuOpen = false; }
  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    menuOpen = !menuOpen;
  }

  // Close on outside click
  $effect(() => {
    const handler = () => closeMenu();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  });
</script>

<div id="toolbar">
  <span class="logo">DRAWDIO</span>
  <div class="toolbar-separator"></div>

  <!-- Hamburger menu: File + Export + Settings -->
  <div class="toolbar-dropdown">
    <button class="toolbar-btn toolbar-hamburger" onclick={toggleMenu} title="Menu" aria-label="Menu">
      ☰
    </button>
    {#if menuOpen}
      <div class="toolbar-dropdown-menu open toolbar-hamburger-menu" role="menu" tabindex="-1"
           onclick={(e: MouseEvent) => e.stopPropagation()}
           onkeydown={(e: KeyboardEvent) => e.stopPropagation()}>

        <!-- File section -->
        <div class="toolbar-menu-section-label">File</div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); newProject(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); newProject(); } }}>
          <span>New</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); document.getElementById('file-input')?.click(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); document.getElementById('file-input')?.click(); } }}>
          <span>Open...</span><span class="toolbar-dropdown-shortcut">Ctrl+O</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); save(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); save(); } }}>
          <span>Save</span><span class="toolbar-dropdown-shortcut">Ctrl+S</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); saveAs(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); saveAs(); } }}>
          <span>Save As...</span>
        </div>

        <div class="toolbar-dropdown-sep"></div>

        <!-- Export section -->
        <div class="toolbar-menu-section-label">Export</div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); exportPNG(1); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); exportPNG(1); } }}>
          <span>PNG 1x</span><span class="toolbar-dropdown-shortcut">Ctrl+E</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); exportPNG(2); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); exportPNG(2); } }}>
          <span>PNG 2x</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); exportPNG(3); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); exportPNG(3); } }}>
          <span>PNG 3x</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); exportPNG(1, true); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); exportPNG(1, true); } }}>
          <span>PNG Transparent</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); exportSVG(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); exportSVG(); } }}>
          <span>SVG</span><span class="toolbar-dropdown-shortcut">Ctrl+Shift+E</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); save(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); save(); } }}>
          <span>JSON File</span>
        </div>
        <div class="toolbar-dropdown-item" role="button" tabindex="0"
             onclick={() => { closeMenu(); copyJSONToClipboard(); }}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { closeMenu(); copyJSONToClipboard(); } }}>
          <span>JSON to Clipboard</span><span class="toolbar-dropdown-shortcut">Ctrl+Shift+C</span>
        </div>

        <div class="toolbar-dropdown-sep"></div>

        <!-- Accent color settings -->
        <div class="toolbar-menu-section-label">Accent Color</div>
        <div class="toolbar-color-grid">
          {#each ACCENT_PRESETS as preset}
            <button
              class="toolbar-color-swatch"
              class:toolbar-color-swatch-active={appState.accentColor === preset.value}
              style="background: {preset.value}"
              title={preset.label}
              onclick={() => { appState.accentColor = preset.value; }}
            ></button>
          {/each}
        </div>
        <div class="toolbar-color-custom">
          <label class="toolbar-color-custom-label" for="toolbar-accent-hex">Hex</label>
          <input id="toolbar-accent-hex" class="toolbar-color-hex-input" type="text"
                 maxlength="7" spellcheck="false"
                 value={appState.accentColor}
                 oninput={(e) => {
                   const v = (e.target as HTMLInputElement).value;
                   if (/^#[0-9a-fA-F]{6}$/.test(v)) appState.accentColor = v;
                 }} />
          <input class="toolbar-color-native" type="color"
                 value={appState.accentColor}
                 oninput={(e) => { appState.accentColor = (e.target as HTMLInputElement).value; }} />
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
  <span class="toolbar-info">{appState.canvasWidth} × {appState.canvasHeight}</span>

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
    <label class="toolbar-info toolbar-step-label" for="toolbar-rot-step" title="Rotation step for [ ] keys (Shift: always ±45°)">°step</label>
    <input
      id="toolbar-rot-step"
      class="toolbar-input-sm"
      type="number"
      min="1" max="180" step="1"
      title="Rotation step for [ ] keys (Shift: always ±45°)"
      value={appState.rotationStep}
      oninput={(e) => {
        const v = Math.max(1, Math.min(180, Number((e.target as HTMLInputElement).value)));
        if (!isNaN(v)) appState.rotationStep = v;
      }}
    />
  </div>
</div>
