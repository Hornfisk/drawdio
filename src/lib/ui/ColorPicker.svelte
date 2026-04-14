<script lang="ts">
  import { onMount, untrack } from 'svelte';

  let {
    color,
    x,
    y,
    swatches,
    onchange,
    onswatchsave,
    onreset,
    onclose,
  }: {
    color: string;
    x: number;
    y: number;
    swatches: string[];
    onchange: (hex: string) => void;
    onswatchsave: (index: number, hex: string) => void;
    onreset: () => void;
    onclose: () => void;
  } = $props();

  // --- HSB state ---
  let hue = $state(0);
  let sat = $state(1);
  let bri = $state(1);
  let hexInput = $state('#000000');
  let sbDragging = $state(false);
  let hueDragging = $state(false);

  let sbCanvas: HTMLCanvasElement;
  let hueCanvas: HTMLCanvasElement;

  // --- Conversion helpers ---
  function hsbToHex(h: number, s: number, b: number): string {
    const c = b * s;
    const xv = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = b - c;
    let r = 0, g = 0, bl = 0;
    if (h < 60)       { r = c; g = xv; }
    else if (h < 120) { r = xv; g = c; }
    else if (h < 180) { g = c; bl = xv; }
    else if (h < 240) { g = xv; bl = c; }
    else if (h < 300) { r = xv; bl = c; }
    else              { r = c; bl = xv; }
    const ri = Math.round((r + m) * 255);
    const gi = Math.round((g + m) * 255);
    const bi = Math.round((bl + m) * 255);
    return `#${ri.toString(16).padStart(2,'0')}${gi.toString(16).padStart(2,'0')}${bi.toString(16).padStart(2,'0')}`;
  }

  function hexToHsb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return [hue, sat, bri];
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    const bv = max;
    const sv = max === 0 ? 0 : d / max;
    let hv = 0;
    if (d !== 0) {
      if (max === r) hv = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) hv = ((b - r) / d + 2) * 60;
      else hv = ((r - g) / d + 4) * 60;
    }
    return [hv, sv, bv];
  }

  // --- Canvas drawing ---
  function drawSB() {
    if (!sbCanvas) return;
    const ctx = sbCanvas.getContext('2d')!;
    const w = sbCanvas.width, h = sbCanvas.height;
    const hGrad = ctx.createLinearGradient(0, 0, w, 0);
    hGrad.addColorStop(0, '#ffffff');
    hGrad.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, w, h);
    const vGrad = ctx.createLinearGradient(0, 0, 0, h);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawHue() {
    if (!hueCanvas) return;
    const ctx = hueCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, hueCanvas.width, 0);
    for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, hueCanvas.width, hueCanvas.height);
  }

  // Capture the original color once so Cancel/Escape can revert.
  // untrack() avoids a reactivity warning about reading the $props value into a local const.
  const originalColor = untrack(() => color);
  let committed = false;
  let userInteracted = $state(false);

  // --- Init ---
  onMount(() => {
    const [h, s, b] = hexToHsb(color);
    hue = h; sat = s; bri = b;
    hexInput = color;
    drawSB();
    drawHue();
  });

  // Live preview: push every HSB change back to the caller so the canvas updates in real time.
  // Gated on userInteracted so the initial mount doesn't echo onchange() back to the parent
  // (which could ping-pong through the parent's reactivity and close the picker).
  $effect(() => {
    if (!userInteracted) return;
    onchange(hsbToHex(hue, sat, bri));
  });

  function cancelColor() {
    if (!committed && userInteracted) onchange(originalColor);
    onclose();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); cancelColor(); }
    else if (e.key === 'Enter') { e.preventDefault(); applyColor(); }
  }

  // Redraw SB when hue changes
  $effect(() => { void hue; drawSB(); });

  // Sync hex input when HSB changes (but not while user is typing in hex)
  let suppressHexSync = false;
  $effect(() => {
    const hex = hsbToHex(hue, sat, bri);
    if (!suppressHexSync) hexInput = hex;
  });

  // --- Derived ---
  const currentHex = $derived(hsbToHex(hue, sat, bri));
  const cursorX = $derived(sat * 160);
  const cursorY = $derived((1 - bri) * 120);
  const hueMarkerX = $derived((hue / 360) * 160);

  // --- SB drag ---
  function onSBDown(e: MouseEvent) {
    sbDragging = true;
    userInteracted = true;
    updateSB(e);
  }
  function updateSB(e: MouseEvent) {
    const rect = sbCanvas.getBoundingClientRect();
    sat = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    bri = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
  }

  // --- Hue drag ---
  function onHueDown(e: MouseEvent) {
    hueDragging = true;
    userInteracted = true;
    updateHue(e);
  }
  function updateHue(e: MouseEvent) {
    const rect = hueCanvas.getBoundingClientRect();
    hue = Math.max(0, Math.min(359.9, ((e.clientX - rect.left) / rect.width) * 360));
  }

  // --- Global mouse ---
  function onGlobalMove(e: MouseEvent) {
    if (sbDragging) updateSB(e);
    if (hueDragging) updateHue(e);
  }
  function onGlobalUp() { sbDragging = false; hueDragging = false; }

  // --- Hex input ---
  function onHexKey(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    hexInput = v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      suppressHexSync = true;
      userInteracted = true;
      const [h, s, b] = hexToHsb(v);
      hue = h; sat = s; bri = b;
      suppressHexSync = false;
    }
  }

  function applyColor() {
    onchange(currentHex);
    committed = true;
    onclose();
  }

  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
  async function pickFromScreen() {
    try {
      // @ts-expect-error EyeDropper is a Chromium-only global, not in lib.dom yet
      const ed = new window.EyeDropper();
      const result = await ed.open();
      const hex: string = result.sRGBHex;
      suppressHexSync = true;
      userInteracted = true;
      const [h, s, b] = hexToHsb(hex);
      hue = h; sat = s; bri = b;
      hexInput = hex;
      suppressHexSync = false;
    } catch {
      // user cancelled or API unavailable
    }
  }
</script>

<svelte:window onmousemove={onGlobalMove} onmouseup={onGlobalUp} onkeydown={onKeyDown} />

<!-- Invisible backdrop: outside click reverts (treat as cancel) -->
<div class="cp-backdrop" onclick={cancelColor} role="presentation"></div>

<div class="cp-panel" style="left:{x}px; top:{y}px;" role="dialog" aria-label="Color picker">

  <!-- Saturation / Brightness gradient -->
  <div class="cp-sb-wrap">
    <canvas bind:this={sbCanvas} width="160" height="120" class="cp-sb-canvas"
            onmousedown={onSBDown}></canvas>
    <div class="cp-sb-cursor" style="left:{cursorX}px; top:{cursorY}px;"></div>
  </div>

  <!-- Hue bar -->
  <div class="cp-hue-wrap">
    <canvas bind:this={hueCanvas} width="160" height="14" class="cp-hue-canvas"
            onmousedown={onHueDown}></canvas>
    <div class="cp-hue-marker" style="left:{hueMarkerX}px;"></div>
  </div>

  <!-- Color preview + hex input -->
  <div class="cp-preview-row">
    <div class="cp-preview-old" style="background:{color}" title="Original color"></div>
    <div class="cp-arrow">→</div>
    <div class="cp-preview-new" style="background:{currentHex}" title="New color"></div>
    <input class="cp-hex-input" type="text" maxlength="7" spellcheck="false"
           value={hexInput} oninput={onHexKey} />
    {#if hasEyeDropper}
      <button class="cp-eyedropper" type="button" onclick={pickFromScreen}
              title="Pick color from screen" aria-label="Pick color from screen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 22 1-1h3l9-9"/>
          <path d="M3 21v-3l9-9"/>
          <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>
        </svg>
      </button>
    {/if}
  </div>

  <!-- Swatch save row -->
  <div class="cp-swatch-row">
    <span class="cp-swatch-label">Save:</span>
    {#each swatches as sw, i}
      <button class="cp-mini-swatch" style="background:{sw}"
              title="Save to slot {i + 1} (currently {sw})"
              onclick={() => onswatchsave(i, currentHex)}></button>
    {/each}
    <button class="cp-reset-btn" onclick={onreset} title="Reset all swatches to defaults">↺</button>
  </div>

  <!-- Apply / Cancel -->
  <div class="cp-btn-row">
    <button class="cp-btn cp-btn-cancel" onclick={cancelColor}>Cancel</button>
    <button class="cp-btn cp-btn-apply" onclick={applyColor}>Apply</button>
  </div>
</div>

<style>
.cp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.cp-panel {
  position: fixed;
  z-index: 9999;
  background: var(--bg-menu);
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  padding: 8px;
  box-shadow: 0 10px 28px rgba(0,0,0,0.65);
  width: 176px;
  box-sizing: content-box;
  user-select: none;
}

/* SB gradient area */
.cp-sb-wrap {
  position: relative;
  width: 160px;
  height: 120px;
  margin-bottom: 6px;
}
.cp-sb-canvas {
  display: block;
  border-radius: 4px;
  cursor: crosshair;
  width: 160px;
  height: 120px;
}
.cp-sb-cursor {
  position: absolute;
  width: 10px; height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.6);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Hue bar */
.cp-hue-wrap {
  position: relative;
  width: 160px;
  height: 14px;
  margin-bottom: 9px;
}
.cp-hue-canvas {
  display: block;
  border-radius: 3px;
  cursor: ew-resize;
  width: 160px;
  height: 14px;
}
.cp-hue-marker {
  position: absolute;
  top: -2px;
  width: 4px; height: 18px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.5);
  border-radius: 2px;
  transform: translateX(-50%);
  pointer-events: none;
}

/* Preview row */
.cp-preview-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
}
.cp-preview-old, .cp-preview-new {
  width: 22px; height: 22px;
  border-radius: 3px;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.cp-arrow {
  font-size: 10px;
  color: var(--text-dim);
}
.cp-hex-input {
  flex: 1;
  min-width: 0;
  background: var(--bg-input);
  color: var(--text);
  border: 1px solid var(--border-muted);
  border-radius: 3px;
  padding: 3px 5px;
  font-size: 11px;
  font-family: monospace;
  user-select: text;
  -webkit-user-select: text;
}
.cp-hex-input:focus { outline: 1px solid var(--accent); }
.cp-eyedropper {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border: 1px solid var(--border-muted);
  border-radius: 3px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}
.cp-eyedropper:hover { color: var(--text); border-color: var(--text-muted); }

/* Swatch save row */
.cp-swatch-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.cp-swatch-label {
  font-size: 9px;
  color: var(--text-dimmer);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  margin-right: 1px;
}
.cp-mini-swatch {
  flex: 1 1 0;
  min-width: 0;
  height: 16px;
  border-radius: 2px;
  border: 1.5px solid var(--border);
  cursor: pointer;
  transition: border-color 0.1s;
  padding: 0;
}
.cp-mini-swatch:hover {
  border-color: var(--text);
}
.cp-reset-btn {
  font-size: 12px;
  line-height: 1;
  background: none;
  border: 1px solid var(--border-muted);
  color: var(--text-dim);
  border-radius: 3px;
  cursor: pointer;
  padding: 1px 4px;
  height: 16px;
  transition: color 0.1s, border-color 0.1s;
}
.cp-reset-btn:hover { color: var(--text); border-color: var(--text-muted); }

/* Buttons */
.cp-btn-row {
  display: flex;
  gap: 6px;
}
.cp-btn {
  flex: 1;
  font-size: 11px;
  padding: 5px 0;
  border-radius: 4px;
  cursor: pointer;
  font-family: system-ui, sans-serif;
}
.cp-btn-cancel {
  background: var(--bg-input);
  border: 1px solid var(--border-muted);
  color: var(--text-secondary);
}
.cp-btn-cancel:hover { border-color: var(--text-muted); color: var(--text); }
.cp-btn-apply {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}
.cp-btn-apply:hover { filter: brightness(1.1); }
</style>
