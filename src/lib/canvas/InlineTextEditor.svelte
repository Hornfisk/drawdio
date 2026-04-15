<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { inlineEdit, stopInlineEdit } from '../ui/inline-edit.svelte.js';
  import { getTextValue, setTextValue } from '../components/text-fields.js';
  import { pushHistory } from '../state/history.js';
  import { tick } from 'svelte';

  let { svgEl, containerEl }: { svgEl: SVGSVGElement; containerEl: HTMLElement } = $props();

  let inputEl: HTMLInputElement | undefined = $state();
  let value = $state('');
  let committed = false;

  // Track the bounding box in container-relative screen coords.
  const comp = $derived(
    appState.components.find(c => c.id === inlineEdit.componentId) ?? null
  );

  // Auto-cancel if component is deleted while editing.
  $effect(() => {
    if (inlineEdit.componentId && !comp) stopInlineEdit();
  });

  // Seed the input value once per edit session.
  $effect(() => {
    const id = inlineEdit.componentId;
    if (id && comp) {
      value = getTextValue(comp) ?? '';
      committed = false;
      tick().then(() => {
        inputEl?.focus();
        inputEl?.select();
      });
    }
  });

  // Recomputes position when: zoom, pan, comp.x/y/width/height change.
  // Reactive on appState so pan/zoom updates follow naturally.
  const box = $derived.by(() => {
    if (!comp || !svgEl || !containerEl) return null;
    // Touch reactive deps so this recomputes.
    void appState.zoom; void appState.panX; void appState.panY;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return null;
    const svgRect = svgEl.getBoundingClientRect();
    const cRect = containerEl.getBoundingClientRect();
    // Canvas→screen point using CTM; then subtract container origin.
    const tl = { x: ctm.a * comp.x + ctm.c * comp.y + ctm.e,
                 y: ctm.b * comp.x + ctm.d * comp.y + ctm.f };
    const br = { x: ctm.a * (comp.x + comp.width)  + ctm.c * (comp.y + comp.height) + ctm.e,
                 y: ctm.b * (comp.x + comp.width)  + ctm.d * (comp.y + comp.height) + ctm.f };
    void svgRect; // silence unused — kept if we want to clamp later
    return {
      left: Math.min(tl.x, br.x) - cRect.left,
      top:  Math.min(tl.y, br.y) - cRect.top,
      width:  Math.abs(br.x - tl.x),
      height: Math.abs(br.y - tl.y),
    };
  });

  function commit() {
    if (committed || !comp) { stopInlineEdit(); return; }
    committed = true;
    const current = getTextValue(comp) ?? '';
    if (value !== current) {
      pushHistory();
      setTextValue(comp, value);
      appState.isDirty = true;
    }
    stopInlineEdit();
  }

  function cancel() {
    committed = true;
    stopInlineEdit();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commit(); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); return; }
    // Swallow shortcuts so they don't trigger global handlers.
    e.stopPropagation();
  }

  // For label_text, honor the font styling so the editor looks close to the rendered text.
  const fontStyle = $derived.by(() => {
    if (!comp || comp.type !== 'label_text') return '';
    const p = comp.properties;
    const size = Math.max(8, Number(p.fontSize ?? 14) * appState.zoom);
    const weight = p.bold ? '700' : '400';
    const italic = p.italic ? 'italic' : 'normal';
    const family = (p.fontFamily as string) ?? 'sans-serif';
    return `font-size: ${size}px; font-weight: ${weight}; font-style: ${italic}; font-family: ${family};`;
  });
</script>

{#if comp && box}
  <input
    bind:this={inputEl}
    class="inline-text-editor"
    type="text"
    bind:value
    onkeydown={onKeyDown}
    onblur={commit}
    onmousedown={(e) => e.stopPropagation()}
    onpointerdown={(e) => e.stopPropagation()}
    style="left: {box.left}px; top: {box.top}px; width: {box.width}px; height: {box.height}px; {fontStyle}"
  />
{/if}

<style>
  .inline-text-editor {
    position: absolute;
    z-index: 600;
    box-sizing: border-box;
    padding: 2px 4px;
    margin: 0;
    background: var(--surface);
    color: var(--text-primary);
    border: 2px solid var(--accent);
    border-radius: 3px;
    outline: none;
    font: inherit;
    min-width: 40px;
    min-height: 20px;
  }
</style>
