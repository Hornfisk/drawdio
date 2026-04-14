<script lang="ts">
  import { appState } from '../state/app.svelte.js';

  const SHORTCUTS = [
    { category: 'File', items: [
      { key: 'Ctrl+S',      desc: 'Save' },
      { key: 'Ctrl+O',      desc: 'Open…' },
      { key: 'Ctrl+E',      desc: 'Export PNG' },
      { key: 'Ctrl+Shift+E', desc: 'Export SVG' },
      { key: 'Ctrl+Shift+C', desc: 'Copy JSON to clipboard' },
    ]},
    { category: 'Edit', items: [
      { key: 'Ctrl+Z',      desc: 'Undo' },
      { key: 'Ctrl+Shift+Z', desc: 'Redo' },
      { key: 'Ctrl+C',      desc: 'Copy' },
      { key: 'Ctrl+X',      desc: 'Cut' },
      { key: 'Ctrl+V',      desc: 'Paste (image from clipboard or components)' },
      { key: 'Ctrl+Shift+V', desc: 'Paste clipboard image as reference' },
      { key: 'Ctrl+D',      desc: 'Duplicate' },
      { key: 'Delete',      desc: 'Delete selected' },
      { key: 'Ctrl+A',      desc: 'Select all' },
      { key: 'Escape',      desc: 'Deselect / cancel placing' },
    ]},
    { category: 'Arrange', items: [
      { key: 'Ctrl+G',       desc: 'Group' },
      { key: 'Ctrl+Shift+G', desc: 'Ungroup' },
      { key: 'Ctrl+]',       desc: 'Bring forward' },
      { key: 'Ctrl+[',       desc: 'Send backward' },
      { key: 'Ctrl+Shift+]', desc: 'Bring to front' },
      { key: 'Ctrl+Shift+[', desc: 'Send to back' },
    ]},
    { category: 'View', items: [
      { key: 'G',       desc: 'Toggle grid' },
      { key: '+  /  =', desc: 'Zoom in' },
      { key: '-',       desc: 'Zoom out' },
      { key: 'Ctrl+0',  desc: 'Reset zoom' },
      { key: 'Space',   desc: 'Pan mode (hold)' },
      { key: '?',       desc: 'Show this help' },
    ]},
  ];

  let dialogEl = $state<HTMLDivElement | undefined>(undefined);

  function close() {
    appState.showShortcutsHelp = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  $effect(() => {
    if (appState.showShortcutsHelp && dialogEl) {
      dialogEl.focus();
    }
  });
</script>

{#if appState.showShortcutsHelp}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="shortcuts-backdrop" onclick={close} role="presentation"></div>
  <div class="shortcuts-dialog"
       bind:this={dialogEl}
       role="dialog"
       aria-label="Keyboard shortcuts"
       aria-modal="true"
       tabindex="-1"
       onkeydown={onKeyDown}>
    <div class="shortcuts-header">
      <span class="shortcuts-title">Keyboard Shortcuts</span>
      <button class="shortcuts-close" onclick={close} aria-label="Close shortcuts help">×</button>
    </div>
    <div class="shortcuts-grid">
      {#each SHORTCUTS as section}
        <div class="shortcuts-section">
          <div class="shortcuts-category">{section.category}</div>
          {#each section.items as item}
            <div class="shortcuts-row">
              <kbd class="shortcuts-key">{item.key}</kbd>
              <span class="shortcuts-desc">{item.desc}</span>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .shortcuts-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 5000;
  }
  .shortcuts-dialog {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-menu);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    z-index: 5001;
    width: min(680px, 95vw);
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }
  .shortcuts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .shortcuts-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .shortcuts-close {
    background: none; border: none; color: var(--text-muted);
    font-size: 20px; cursor: pointer; padding: 0 4px; border-radius: 4px;
  }
  .shortcuts-close:hover { color: var(--text); }
  .shortcuts-close:focus-visible { outline: 2px solid var(--accent); }
  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
  @media (max-width: 500px) {
    .shortcuts-grid { grid-template-columns: 1fr; }
  }
  .shortcuts-category {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px;
  }
  .shortcuts-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 5px; font-size: 12px;
  }
  .shortcuts-key {
    font-family: monospace; font-size: 11px;
    background: var(--bg-input); color: var(--text-secondary);
    border: 1px solid var(--border-muted); border-radius: 3px;
    padding: 1px 6px; white-space: nowrap; flex-shrink: 0;
    min-width: 90px; text-align: center;
  }
  .shortcuts-desc { color: var(--text-secondary); }
</style>
