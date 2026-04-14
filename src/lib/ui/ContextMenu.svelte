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
  let triggerEl: Element | null = null;

  function buildForSelection(): MenuItem[] {
    const hasSelection = appState.selectedIds.length > 0;
    const multiSelected = appState.selectedIds.length > 1;
    let hasGroup = false;
    for (const id of appState.selectedIds) {
      if (getGroupOf(id)) { hasGroup = true; break; }
    }
    const hasClipboard = appState.clipboard.length > 0;
    return [
      { label: 'Copy',         shortcut: 'Ctrl+C',       action: doCopy,                                         disabled: !hasSelection },
      { label: 'Cut',          shortcut: 'Ctrl+X',       action: doCut,                                          disabled: !hasSelection },
      { label: 'Paste',        shortcut: 'Ctrl+V',       action: doPaste,                                        disabled: !hasClipboard },
      { label: 'Duplicate',    shortcut: 'Ctrl+D',       action: doDuplicate,                                    disabled: !hasSelection },
      { separator: true, label: '', action: () => {} },
      { label: 'Group',        shortcut: 'Ctrl+G',       action: () => createGroup([...appState.selectedIds]),   disabled: !multiSelected },
      { label: 'Ungroup',      shortcut: 'Ctrl+Shift+G', action: ungroupSelected,                                disabled: !hasGroup },
      { separator: true, label: '', action: () => {} },
      { label: 'Bring Forward',  shortcut: 'Ctrl+]',       action: () => bringForward(appState.selectedIds) },
      { label: 'Send Backward',  shortcut: 'Ctrl+[',       action: () => sendBackward(appState.selectedIds) },
      { label: 'Bring to Front', shortcut: 'Ctrl+Shift+]', action: () => bringToFront(appState.selectedIds) },
      { label: 'Send to Back',   shortcut: 'Ctrl+Shift+[', action: () => sendToBack(appState.selectedIds) },
      { separator: true, label: '', action: () => {} },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
      { label: 'Delete',     shortcut: 'Del',    action: deleteSelected, disabled: !hasSelection },
    ];
  }

  function buildForCanvas(): MenuItem[] {
    const hasClipboard = appState.clipboard.length > 0;
    return [
      { label: 'Paste',      shortcut: 'Ctrl+V', action: doPaste,  disabled: !hasClipboard },
      { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
    ];
  }

  function hide() {
    visible = false;
    // Return focus to the element that triggered the menu
    if (triggerEl instanceof HTMLElement) triggerEl.focus();
    triggerEl = null;
  }

  function onItemClick(item: MenuItem) {
    if (item.disabled) return;
    hide();
    item.action();
  }

  /** Returns all focusable (non-disabled, non-separator) menu item elements */
  function getMenuItems(): HTMLElement[] {
    if (!menuEl) return [];
    return Array.from(menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]:not(.disabled)'));
  }

  function handleContextMenu(e: Event) {
    const ce = e as CustomEvent<{ x: number; y: number; hasSelection: boolean }>;
    triggerEl = document.activeElement;
    x = ce.detail.x;
    y = ce.detail.y;
    items = ce.detail.hasSelection ? buildForSelection() : buildForCanvas();
    visible = true;

    requestAnimationFrame(() => {
      if (menuEl) {
        const rect = menuEl.getBoundingClientRect();
        if (rect.right > window.innerWidth) x = ce.detail.x - rect.width;
        if (rect.bottom > window.innerHeight) y = ce.detail.y - rect.height;
        // Focus first non-disabled item
        getMenuItems()[0]?.focus();
      }
    });
  }

  $effect(() => {
    window.addEventListener('drawdio-contextmenu', handleContextMenu);
    const dismiss = (e: MouseEvent) => {
      if (visible && menuEl && !menuEl.contains(e.target as Node)) hide();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === 'Escape') { hide(); e.preventDefault(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const menuItems = getMenuItems();
        if (menuItems.length === 0) return;
        const focused = menuEl?.querySelector<HTMLElement>('[role="menuitem"]:focus');
        const idx = focused ? menuItems.indexOf(focused) : -1;
        const next = e.key === 'ArrowDown'
          ? menuItems[(idx + 1) % menuItems.length]
          : menuItems[(idx - 1 + menuItems.length) % menuItems.length];
        next?.focus();
      }
    };
    window.addEventListener('mousedown', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('drawdio-contextmenu', handleContextMenu);
      window.removeEventListener('mousedown', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  });
</script>

{#if visible}
  <div class="context-menu" bind:this={menuEl}
       role="menu"
       aria-label="Context menu"
       style="left: {x}px; top: {y}px;">
    {#each items as item}
      {#if item.separator}
        <div class="context-menu-separator" role="separator"></div>
      {:else}
        <div class="context-menu-item" class:disabled={item.disabled}
             onclick={() => onItemClick(item)}
             onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(item); } }}
             role="menuitem"
             aria-disabled={item.disabled}
             tabindex={item.disabled ? -1 : 0}>
          <span>{item.label}</span>
          {#if item.shortcut}
            <span class="context-menu-shortcut">{item.shortcut}</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
{/if}
