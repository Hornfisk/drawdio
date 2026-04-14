import { appState } from '../state/app.svelte.js';
import { selectAll, deleteSelected, clearSelection } from '../state/selection.js';
import { doCopy, doCut, doPaste, doDuplicate } from '../state/clipboard.js';
import { undo, redo } from '../state/history.js';
import { createGroup, ungroupSelected } from '../state/groups.js';
import { bringForward, sendBackward, bringToFront, sendToBack } from '../state/zorder.js';
import { save, openProject } from '../io/serialization.js';
import { exportPNG, exportSVG, copyJSONToClipboard } from '../io/export.js';
import { pushHistory } from '../state/history.js';
import { expandSelection } from '../state/groups.js';
import { pasteImageAsComponent, setRefImageFromDataUrl } from '../io/refImage.js';

export function initShortcuts(): () => void {
  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as Element;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    if (isInput) {
      // Escape blurs the field and returns focus to the canvas so arrow-nudge works again.
      if (e.key === 'Escape') {
        (target as HTMLElement).blur();
        (document.querySelector('.canvas-container') as HTMLElement | null)?.focus();
        e.preventDefault();
      }
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();

    // Delete / Backspace
    if (key === 'delete' || key === 'backspace') {
      deleteSelected();
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+G — ungroup
    if (key === 'g' && ctrl && shift) {
      ungroupSelected();
      e.preventDefault();
      return;
    }

    // Ctrl+G — group
    if (key === 'g' && ctrl) {
      if (appState.selectedIds.length > 1) {
        createGroup([...appState.selectedIds]);
      }
      e.preventDefault();
      return;
    }

    // G — toggle grid
    if (key === 'g' && !ctrl) {
      appState.gridVisible = !appState.gridVisible;
      return;
    }

    // Ctrl+Shift+Z — redo
    if (key === 'z' && ctrl && shift) {
      redo();
      e.preventDefault();
      return;
    }

    // Ctrl+Z — undo
    if (key === 'z' && ctrl) {
      undo();
      e.preventDefault();
      return;
    }

    // Ctrl+A — select all
    if (key === 'a' && ctrl) {
      selectAll();
      e.preventDefault();
      return;
    }

    // Ctrl+D — duplicate
    if (key === 'd' && ctrl) {
      doDuplicate();
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+C — copy JSON to clipboard
    if (key === 'c' && ctrl && shift) {
      copyJSONToClipboard();
      e.preventDefault();
      return;
    }

    // Ctrl+C — copy
    if (key === 'c' && ctrl) {
      doCopy();
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+V — paste clipboard image as reference image
    if (key === 'v' && ctrl && shift) {
      (async () => {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const type = item.types.find(t => t.startsWith('image/'));
            if (type) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = () => setRefImageFromDataUrl(reader.result as string);
              reader.readAsDataURL(blob);
              return;
            }
          }
        } catch (err) {
          console.warn('Clipboard read failed:', err);
        }
      })();
      e.preventDefault();
      return;
    }

    // Ctrl+V — handled by the `paste` event listener below (image or components)

    // Ctrl+X — cut
    if (key === 'x' && ctrl) {
      doCut();
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+] — bring to front
    if (key === ']' && ctrl && shift) {
      bringToFront(appState.selectedIds);
      e.preventDefault();
      return;
    }

    // Ctrl+] — bring forward
    if (key === ']' && ctrl) {
      bringForward(appState.selectedIds);
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+[ — send to back
    if (key === '[' && ctrl && shift) {
      sendToBack(appState.selectedIds);
      e.preventDefault();
      return;
    }

    // Ctrl+[ — send backward
    if (key === '[' && ctrl) {
      sendBackward(appState.selectedIds);
      e.preventDefault();
      return;
    }

    // Ctrl+S — save
    if (key === 's' && ctrl) {
      save();
      e.preventDefault();
      return;
    }

    // Ctrl+O — open
    if (key === 'o' && ctrl) {
      openProject();
      e.preventDefault();
      return;
    }

    // Ctrl+Shift+E — export SVG
    if (key === 'e' && ctrl && shift) {
      exportSVG();
      e.preventDefault();
      return;
    }

    // Ctrl+E — export PNG
    if (key === 'e' && ctrl) {
      exportPNG(1);
      e.preventDefault();
      return;
    }

    // Ctrl+0 — zoom to fit
    if (ctrl && key === '0') {
      appState.zoom = 1;
      appState.panX = 0;
      appState.panY = 0;
      e.preventDefault();
      return;
    }

    // + / = — zoom in
    if (key === '=' || key === '+') {
      appState.zoom = Math.min(4, appState.zoom + 0.1);
      e.preventDefault();
      return;
    }

    // - — zoom out
    if (key === '-') {
      appState.zoom = Math.max(0.25, appState.zoom - 0.1);
      e.preventDefault();
      return;
    }

    // Arrow keys — nudge selection (1px, Shift: 10px)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (appState.selectedIds.length === 0) return;
      const step = shift ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else dy = step;
      pushHistory();
      const ids = expandSelection([...appState.selectedIds]);
      for (const id of ids) {
        const comp = appState.components.find(c => c.id === id);
        if (comp) { comp.x += dx; comp.y += dy; }
      }
      appState.isDirty = true;
      e.preventDefault();
      return;
    }

    // Escape — clear selection, cancel placing
    if (key === 'escape') {
      clearSelection();
      appState.placingType = null;
      e.preventDefault();
      return;
    }

    // ? — toggle shortcuts help
    if (key === '?' || (key === '/' && shift)) {
      appState.showShortcutsHelp = !appState.showShortcutsHelp;
      e.preventDefault();
      return;
    }
  }

  function onPaste(e: ClipboardEvent) {
    const target = e.target as Element | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const items = e.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          const name = file.name.replace(/\.[^.]+$/, '') || 'Pasted Image';
          reader.onload = () => pasteImageAsComponent(reader.result as string, name);
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }
    }
    // No image — fall back to component paste
    doPaste();
    e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('paste', onPaste);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('paste', onPaste);
  };
}
