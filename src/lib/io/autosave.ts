import { appState } from '../state/app.svelte.js';
import { toJSON, fromJSON } from './serialization.js';
import { showToast } from '../state/toast.svelte.js';

export function startAutoSave(): () => void {
  const timer = setInterval(() => {
    if (appState.components.length === 0) return;
    try {
      const json = toJSON();
      localStorage.setItem('drawdio_autosave', JSON.stringify(json));
      localStorage.setItem('drawdio_autosave_time', Date.now().toString());
      showToast('Auto-saved', 1500);
    } catch (err) {
      console.warn('Autosave failed (localStorage may be full):', err);
    }
  }, 30000);

  return () => clearInterval(timer);
}

export function checkAutoSave() {
  try {
    const saved = localStorage.getItem('drawdio_autosave');
    const time = localStorage.getItem('drawdio_autosave_time');
    if (saved && time) {
      const ago = Math.round((Date.now() - parseInt(time)) / 60000);
      const label = ago < 1 ? 'just now' : ago + ' min ago';
      if (confirm('Restore auto-saved project from ' + label + '?')) {
        fromJSON(JSON.parse(saved));
      }
    }
  } catch (err) {
    console.warn('Failed to restore autosave:', err);
  }
}
