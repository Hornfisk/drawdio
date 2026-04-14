<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { select, clearSelection, selectAll, deleteSelected } from '../state/selection.js';
  import { doCopy, doCut, doPaste, doDuplicate } from '../state/clipboard.js';
  import { createGroup, ungroupSelected, getGroupOf } from '../state/groups.js';
  import { bringForward, sendBackward, bringToFront, sendToBack } from '../state/zorder.js';

  type MenuItem = {
    label: string;
    shortcut?: string;
    action: () => void;
    disabled?: boolean;
    separator?: boolean;
  };

  let visible = $state(false);
  let x = $state(0);
  let y = $state(0);
  let items = $state<MenuItem[]>([]);
  let menuEl = $state<HTMLDivElement | undefined>(undefined);

  function buildForSelection(): MenuItem[] {
    const hasSelection = appState.selectedIds.length > 0;
    const multiSelected = appState.selectedIds.length > 1;
    let hasGroup = false;
    for (const id of appState.selectedIds) {
      if (getGroupOf(id)) { hasGroup = true; break; }
    }
    const hasClipboard = appState.clipboard.length > 0;

    return [
      { label: 'Copy', shortcut: 'Ctrl+C', action: doCopy, disabled: !hasSelection },
      { label: 'Cut', shortcut: 'Ctrl+X', action: doCut, disabled: !hasSelection },
      { label: 'Paste', shortcut: 'Ctrl+V', action: doPaste, disabled: !hasClipboard },
      { label: 'Duplicate', shortcut: 'Ctrl+D', action: doDuplicate, disabled: !hasSelection },
      { separator: true, label: '', action: () => {} },
      { label: 'Group', shortcut: 'Ctrl+G', action: () => createGroup([...appState.selectedIds]), disabled: !multiSelected },
      { label: 'Ungroup', shortcut: 'Ctrl+Shift+G', action: ungroupSelected, disabled: !hasGroup },
      { separator: true, label: '', action: () => {} },
      { label: 'Bring Forward', shortcut: 'Ctrl+]', action: () => bringForward(appState.selectedIds) },
      { label: 'Send Backward', shortcut: 'Ctrl+[', action: () => sendBackward(appState.selectedIds) },
      { label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', action: () => bringToFront(appState.selectedIds) },
      { label: 'Send to Back', shortcut: 'Ctrl+Shift+[', action: () => sendToBack(appState.selectedIds) },
      { separator: true, label: '', action: () => {} },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
      { label: 'Delete', shortcut: 'Del', action: deleteSelected, disabled: !hasSelection },
    ];
  }

  function buildForCanvas(): MenuItem[] {
    const hasClipboard = appState.clipboard.length > 0;
    return [
      { label: 'Paste', shortcut: 'Ctrl+V', action: doPaste, disabled: !hasClipboard },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
    ];
  }

  function hide() {
    visible = false;
  }

  function onItemClick(item: MenuItem) {
    if (item.disabled) return;
    hide();
    item.action();
  }

  // Expose show via window event
  function handleContextMenu(e: Event) {
    const ce = e as CustomEvent<{ x: number; y: number; hasSelection: boolean }>;
    x = ce.detail.x;
    y = ce.detail.y;
    items = ce.detail.hasSelection ? buildForSelection() : buildForCanvas();
    visible = true;

    // Adjust if off-screen (next tick)
    requestAnimationFrame(() => {
      if (menuEl) {
        const rect = menuEl.getBoundingClientRect();
        if (rect.right > window.innerWidth) x = ce.detail.x - rect.width;
        if (rect.bottom > window.innerHeight) y = ce.detail.y - rect.height;
      }
    });
  }

  // Listen for canvas contextmenu events
  $effect(() => {
    window.addEventListener('drawdio-contextmenu', handleContextMenu);
    const dismiss = (e: MouseEvent) => {
      if (visible && menuEl && !menuEl.contains(e.target as Node)) hide();
    };
    const escDismiss = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('keydown', escDismiss);
    return () => {
      window.removeEventListener('drawdio-contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', escDismiss);
    };
  });
</script>

{#if visible}
  <div class="context-menu" bind:this={menuEl}
       style="left: {x}px; top: {y}px;">
    {#each items as item}
      {#if item.separator}
        <div class="context-menu-separator"></div>
      {:else}
        <div class="context-menu-item" class:disabled={item.disabled}
             onclick={() => onItemClick(item)}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onItemClick(item); }}
             role="menuitem" tabindex="0">
          <span>{item.label}</span>
          {#if item.shortcut}
            <span class="context-menu-shortcut">{item.shortcut}</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
