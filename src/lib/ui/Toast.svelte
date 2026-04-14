<script lang="ts">
  import { toastState } from '../state/toast.svelte.js';
</script>

{#if toastState.toasts.length > 0}
  <div class="toast-container" aria-live="polite" aria-atomic="false">
    {#each toastState.toasts as toast (toast.id)}
      <div class="toast">{toast.message}</div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    top: 52px;
    right: 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 4000;
    pointer-events: none;
  }
  .toast {
    background: var(--bg-menu);
    color: var(--text);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    padding: 8px 14px;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    animation: toast-in 0.2s ease;
  }
  @keyframes toast-in {
    from { opacity: 0; transform: translateX(8px); }
    to   { opacity: 1; transform: translateX(0); }
  }
</style>
