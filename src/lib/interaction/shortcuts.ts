import { appState } from '../state/app.svelte.js';
import { selectAll, deleteSelected, clearSelection } from '../state/selection.js';
import { doCopy, doCut, doPaste, doDuplicate } from '../state/clipboard.js';
import { undo, redo } from '../state/history.js';
import { createGroup, ungroupSelected } from '../state/groups.js';
import { bringForward, sendBackward, bringToFront, sendToBack } from '../state/zorder.js';
import { save } from '../io/serialization.js';
import { exportPNG, exportSVG, copyJSONToClipboard } from '../io/export.js';
import { rotateSelectedBy } from '../state/actions.js';

export function initShortcuts(): () => void {
  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as Element;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    if (isInput) return;

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

    // Ctrl+V — paste
    if (key === 'v' && ctrl) {
      doPaste();
      e.preventDefault();
      return;
    }

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

    // ] — rotate +step (Shift: +45°)
    if (key === ']' && !ctrl) {
      rotateSelectedBy(shift ? 45 : (appState.rotationStep || 15));
      e.preventDefault();
      return;
    }

    // [ — rotate -step (Shift: -45°)
    if (key === '[' && !ctrl) {
      rotateSelectedBy(shift ? -45 : -(appState.rotationStep || 15));
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
      document.getElementById('file-input')?.click();
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

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
