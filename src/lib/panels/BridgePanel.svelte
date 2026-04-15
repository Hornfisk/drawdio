<script lang="ts">
  import { bridgeState, connect, disconnect, setUrl, setAutoConnect, setLayoutPath, launchCommand } from '../sync/bridge.svelte.js';

  let urlInput = $state(bridgeState.url);
  let pathInput = $state(bridgeState.layoutPath);
  let copied = $state(false);

  $effect(() => { urlInput = bridgeState.url; });
  $effect(() => { pathInput = bridgeState.layoutPath; });

  function commitUrl() {
    if (urlInput !== bridgeState.url) {
      setUrl(urlInput.trim());
      if (bridgeState.connected || bridgeState.connecting) {
        disconnect();
        connect();
      }
    }
  }

  function commitPath() {
    if (pathInput !== bridgeState.layoutPath) setLayoutPath(pathInput.trim());
  }

  const cmd = $derived(launchCommand());

  async function copyLaunch() {
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      copied = true;
      setTimeout(() => copied = false, 1500);
    } catch {
      copied = false;
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="bridge-panel" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="group" tabindex="-1">
  <div class="bridge-status" class:online={bridgeState.connected}>
    <span class="dot"></span>
    {#if bridgeState.connected}
      Connected
    {:else if bridgeState.connecting}
      Connecting…
    {:else}
      Offline
    {/if}
  </div>

  {#if bridgeState.connected && bridgeState.targetFile}
    <div class="bridge-target" title={bridgeState.targetFile}>
      <span class="bridge-target-label">Editing</span>
      <span class="bridge-target-path">{bridgeState.targetFile}</span>
    </div>
  {/if}

  <button class="bridge-primary"
          onclick={() => { bridgeState.connected || bridgeState.connecting ? disconnect() : connect(); }}>
    {bridgeState.connected || bridgeState.connecting ? 'Disconnect' : 'Connect'}
  </button>

  <label class="bridge-check">
    <input type="checkbox" checked={bridgeState.autoConnect}
           onchange={(e) => setAutoConnect((e.target as HTMLInputElement).checked)} />
    Auto-connect on startup
  </label>

  <div class="bridge-section-label">Target file (absolute path)</div>
  <input class="bridge-input" type="text" placeholder="/home/.../Resources/Layout.json"
         value={pathInput}
         oninput={(e) => { pathInput = (e.target as HTMLInputElement).value; }}
         onblur={commitPath}
         onkeydown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />

  <div class="bridge-launch">
    <div class="bridge-launch-header">
      <span>Start bridge in a terminal:</span>
      <button class="bridge-copy" onclick={copyLaunch} disabled={!cmd}
              title={cmd ? 'Copy command' : 'Fill in the target file path first'}>
        {copied ? '✓ copied' : 'copy'}
      </button>
    </div>
    {#if cmd}
      <code class="bridge-cmd">{cmd}</code>
    {:else}
      <code class="bridge-cmd bridge-cmd-empty">↑ paste a target file path above to generate the command</code>
    {/if}
    <div class="bridge-hint">Run from the drawdio repo root. First time: <code>npm run bridge:install</code></div>
  </div>

  <div class="bridge-section-label">WebSocket URL</div>
  <input class="bridge-input" type="text" placeholder="ws://localhost:7878"
         value={urlInput}
         oninput={(e) => { urlInput = (e.target as HTMLInputElement).value; }}
         onblur={commitUrl}
         onkeydown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />

  {#if bridgeState.lastError && !bridgeState.connected}
    <div class="bridge-error">{bridgeState.lastError}</div>
  {/if}
</div>

<style>
  .bridge-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 12px 10px;
    min-width: 280px;
  }
  .bridge-status {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #ccc;
  }
  .bridge-status .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #ef5350;
  }
  .bridge-status.online { color: #e0e0e0; }
  .bridge-status.online .dot { background: #4ade80; box-shadow: 0 0 6px #4ade80; }
  .bridge-target {
    display: flex; flex-direction: column;
    font-size: 10px;
    color: #aaa;
    padding: 4px 6px;
    background: rgba(255,255,255,0.04);
    border-radius: 3px;
  }
  .bridge-target-label { color: #888; text-transform: uppercase; letter-spacing: 0.04em; font-size: 9px; }
  .bridge-target-path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
  .bridge-primary {
    padding: 6px 10px;
    background: var(--accent, #4fc3f7);
    color: #111;
    border: none;
    border-radius: 3px;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
  }
  .bridge-primary:hover { filter: brightness(1.1); }
  .bridge-check {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 11px;
    color: #ccc;
    cursor: pointer;
  }
  .bridge-section-label {
    font-size: 9px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 2px;
  }
  .bridge-input {
    padding: 4px 6px;
    background: #1e1e1e;
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 3px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }
  .bridge-input:focus { outline: none; border-color: var(--accent, #4fc3f7); }
  .bridge-launch {
    display: flex; flex-direction: column; gap: 4px;
    padding: 6px 8px;
    background: rgba(0,0,0,0.25);
    border-radius: 3px;
    border: 1px dashed #444;
  }
  .bridge-launch-header {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px;
    color: #aaa;
  }
  .bridge-copy {
    background: #333;
    color: #ddd;
    border: 1px solid #555;
    border-radius: 2px;
    padding: 1px 6px;
    font-size: 10px;
    cursor: pointer;
  }
  .bridge-copy:hover:not(:disabled) { background: #444; }
  .bridge-copy:disabled { opacity: 0.4; cursor: not-allowed; }
  .bridge-cmd-empty { color: #888; font-style: italic; }
  .bridge-cmd {
    display: block;
    background: #111;
    color: #b5e853;
    padding: 4px 6px;
    border-radius: 2px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    word-break: break-all;
    user-select: all;
  }
  .bridge-hint { font-size: 10px; color: #888; }
  .bridge-hint code {
    background: #222;
    padding: 0 3px;
    border-radius: 2px;
    color: #ccc;
  }
  .bridge-error {
    color: #ef5350;
    font-size: 10px;
    padding: 4px 6px;
    background: rgba(239, 83, 80, 0.1);
    border-radius: 2px;
  }
</style>
