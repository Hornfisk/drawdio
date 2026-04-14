// src/lib/state/toast.svelte.ts

interface ToastMessage {
  id: number;
  message: string;
}

let _toasts = $state<ToastMessage[]>([]);
let _nextId = 0;

export const toastState = {
  get toasts() { return _toasts; },
};

export function showToast(message: string, durationMs = 2500): void {
  const id = ++_nextId;
  _toasts = [..._toasts, { id, message }];

  // Also announce to screen reader via the status region
  const statusEl = document.getElementById('app-status');
  if (statusEl) statusEl.textContent = message;

  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
  }, durationMs);
}
