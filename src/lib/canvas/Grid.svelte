<script lang="ts">
  import { appState } from '../state/app.svelte.js';
</script>

<pattern id="grid-pattern" width={appState.gridSize} height={appState.gridSize} patternUnits="userSpaceOnUse">
  <circle cx="1" cy="1" r="0.5" fill="#333" />
</pattern>
