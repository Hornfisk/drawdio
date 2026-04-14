import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    watch: {
      // WSL2 on Windows filesystem (/mnt/c) doesn't fire inotify events.
      // Polling ensures HMR works when editing from WSL.
      usePolling: true,
      interval: 300,
    },
  },
});
