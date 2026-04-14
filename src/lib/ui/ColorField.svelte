<script lang="ts">
  import { mount, unmount } from 'svelte';
  import ColorPicker from './ColorPicker.svelte';
  import { swatchState, saveSwatchAt, resetSwatches } from './swatches.svelte.js';
  import { startPick } from './eyedropper.svelte.js';

  let {
    color,
    onchange,
    showHex = true,
    compact = false,
    title = 'Open color picker',
  }: {
    color: string;
    onchange: (hex: string) => void;
    showHex?: boolean;
    compact?: boolean;
    title?: string;
  } = $props();

  let pickerInstance: ReturnType<typeof mount> | null = null;

  function openPicker(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (pickerInstance) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let px = rect.left;
    let py = rect.bottom + 6;
    if (px + 200 > window.innerWidth) px = window.innerWidth - 204;
    if (px < 4) px = 4;
    if (py + 280 > window.innerHeight) py = rect.top - 284;

    const close = () => {
      if (!pickerInstance) return;
      const inst = pickerInstance;
      pickerInstance = null;
      unmount(inst);
    };

    pickerInstance = mount(ColorPicker, {
      target: document.body,
      props: {
        color,
        x: px,
        y: py,
        swatches: swatchState.list,
        onchange,
        onswatchsave: saveSwatchAt,
        onreset: resetSwatches,
        onclose: close,
      },
    });
  }

  function onHexInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onchange(v);
  }

  async function pickFromScreen(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    // @ts-expect-error EyeDropper is a Chromium-only global, not in lib.dom yet
    const EyeDropperCtor = window.EyeDropper;
    if (EyeDropperCtor) {
      try {
        const ed = new EyeDropperCtor();
        const result = await ed.open();
        onchange(result.sRGBHex);
        return;
      } catch {
        return; // user cancelled
      }
    }
    // Fallback: canvas-scoped picker (works in Brave with fingerprint blocking)
    startPick(onchange);
  }

  // If the ColorField itself unmounts (e.g. selection cleared), tear down the picker too.
  $effect(() => {
    return () => {
      if (pickerInstance) {
        const inst = pickerInstance;
        pickerInstance = null;
        unmount(inst);
      }
    };
  });
</script>

<div class="color-field" class:compact>
  {#if showHex}
    <input class="color-field-hex" type="text" maxlength="7" spellcheck="false"
           value={color} oninput={onHexInput} />
  {/if}
  <button class="color-field-well" style="background:{color}"
          type="button" {title}
          onclick={openPicker}></button>
  <button class="color-field-eyedropper" type="button"
          title="Sample a color from the canvas (raster assets like imported images won't repaint)"
          aria-label="Sample color from canvas"
          onclick={pickFromScreen}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="m2 22 1-1h3l9-9"/>
      <path d="M3 21v-3l9-9"/>
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/>
    </svg>
  </button>
</div>

<style>
.color-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.color-field-hex {
  width: 72px;
  background: var(--bg-input);
  color: var(--text);
  border: 1px solid var(--border-muted);
  border-radius: 3px;
  padding: 3px 5px;
  font-size: 11px;
  font-family: monospace;
}
.color-field-hex:focus { outline: 1px solid var(--accent); }
.color-field.compact .color-field-hex { width: 64px; }
.color-field-well {
  width: 22px;
  height: 22px;
  border-radius: 3px;
  border: 1.5px solid var(--border);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.12s, transform 0.12s;
  padding: 0;
  display: block;
}
.color-field-well:hover { border-color: var(--text); transform: scale(1.1); }
.color-field-well:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.color-field.compact .color-field-well { width: 18px; height: 18px; }
.color-field-eyedropper {
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
.color-field-eyedropper:hover { color: var(--text); border-color: var(--text-muted); }
.color-field.compact .color-field-eyedropper { width: 18px; height: 18px; }
</style>
