<script lang="ts">
  import { appState } from '../state/app.svelte.js';
  import { getSelectedComponents } from '../state/derived.svelte.js';
  import { getEntry } from '../components/registry.js';
  import CollapsibleSection from './CollapsibleSection.svelte';
  import EffectsEditor from './EffectsEditor.svelte';
  import ColorField from '../ui/ColorField.svelte';
  import CurveEditor from '../ui/CurveEditor.svelte';

  let curveEditorOpen = $state(false);
  import { swatchState } from '../ui/swatches.svelte.js';
  import {
    createWorkspace, duplicateActiveWorkspace, switchWorkspace,
    renameWorkspace, deleteWorkspace
  } from '../state/workspaces.js';

  let renamingWsId = $state<string | null>(null);
  let renameDraft = $state('');

  function beginRename(id: string, name: string) {
    renamingWsId = id;
    renameDraft = name;
  }
  function commitRename() {
    if (renamingWsId) renameWorkspace(renamingWsId, renameDraft);
    renamingWsId = null;
    renameDraft = '';
  }

  // Multi-select edit model:
  //  - `targets` is every selected component (1+).
  //  - `anchor` is the first one (used to read schema / default placeholders).
  //  - `allSameType` lets us safely show type-specific Parameters when all share the same type.
  //  - `single` is kept for sections that fundamentally don't fan-out (panel texture, effects).
  //  - getProp / setProp fan reads + writes across all targets:
  //      getProp returns the shared value, or `undefined` if values differ (renders as blank input).
  //      setProp applies the new value to *every* target.
  const targets = $derived(getSelectedComponents());
  const anchor  = $derived<typeof targets[number] | null>(targets[0] ?? null);
  const single  = $derived(targets.length === 1 ? targets[0] : null);
  const multi   = $derived(targets.length > 1);
  const allSameType = $derived(
    targets.length > 0 && targets.every((c) => c.type === targets[0].type)
  );
  const entry = $derived(anchor && allSameType ? getEntry(anchor.type) : null);

  function getCommonValue<T>(read: (c: typeof targets[number]) => T): T | undefined {
    if (targets.length === 0) return undefined;
    const first = read(targets[0]);
    for (let i = 1; i < targets.length; i++) {
      if (read(targets[i]) !== first) return undefined;
    }
    return first;
  }

  function setAll(write: (c: typeof targets[number]) => void): void {
    for (const t of targets) write(t);
    appState.isDirty = true;
  }

  // --- Reference image loader (used by drop hint button) ---
  function loadRefImageFromPanel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          if (appState.components.length > 0) {
            if (!confirm(`Resize canvas to ${img.naturalWidth}×${img.naturalHeight}px?`)) {
              appState.refImageDataUrl = dataUrl;
              appState.refImageVisible = true;
              appState.isDirty = true;
              return;
            }
          }
          appState.canvasWidth = img.naturalWidth;
          appState.canvasHeight = img.naturalHeight;
          appState.refImageDataUrl = dataUrl;
          appState.refImageVisible = true;
          appState.isDirty = true;
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  // --- Panel texture loader ---
  function loadPanelTexture() {
    const selected = single;
    if (!selected) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        selected!.properties.textureDataUrl = reader.result as string;
        selected!.properties.textureOpacity = selected!.properties.textureOpacity ?? 0.8;
        selected!.properties.textureOffsetX = 0;
        selected!.properties.textureOffsetY = 0;
        selected!.properties.textureScale = 1;
        selected!.properties.textureBlend = selected!.properties.textureBlend ?? 'multiply';
        appState.isDirty = true;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function setProp(path: string, value: unknown) {
    if (targets.length === 0) return;
    const parts = path.split('.');
    for (const t of targets) {
      let obj: Record<string, unknown> = t as unknown as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]] as Record<string, unknown>;
      }
      obj[parts[parts.length - 1]] = value;
    }
    appState.isDirty = true;
  }

  function getProp(path: string): unknown {
    if (targets.length === 0) return undefined;
    const parts = path.split('.');
    const readOne = (c: typeof targets[number]): unknown => {
      let obj: unknown = c;
      for (const part of parts) {
        if (obj == null) return undefined;
        obj = (obj as Record<string, unknown>)[part];
      }
      return obj;
    };
    return getCommonValue(readOne);
  }
</script>

{#if anchor}
  {@const commonLabel    = getCommonValue((c) => c.label)}
  {@const commonX        = getCommonValue((c) => c.x)}
  {@const commonY        = getCommonValue((c) => c.y)}
  {@const commonW        = getCommonValue((c) => c.width)}
  {@const commonH        = getCommonValue((c) => c.height)}
  {@const commonRot      = getCommonValue((c) => c.rotation || 0)}
  {@const commonLocked   = getCommonValue((c) => !!c.locked)}
  {@const commonColor    = getCommonValue((c) => c.color)}
  {@const headerTitle    = multi
    ? (allSameType && entry ? `${targets.length} × ${entry.displayName}` : `${targets.length} items`)
    : (entry?.displayName ?? 'Component')}

  <CollapsibleSection title={headerTitle}>
    <!-- Label -->
    <div class="props-row">
      <span class="props-label">Label</span>
      <input class="props-input"
             value={commonLabel ?? ''}
             placeholder={multi && commonLabel === undefined ? 'Mixed' : ''}
             oninput={(e) => setAll((c) => { c.label = (e.target as HTMLInputElement).value; })} />
    </div>
  </CollapsibleSection>

  <CollapsibleSection title="Position">
    <div class="props-row">
      <span class="props-label">X</span>
      <input class="props-input props-input-sm" type="number"
             value={commonX ?? ''} placeholder={commonX === undefined ? '—' : ''}
             oninput={(e) => {
               const v = Number((e.target as HTMLInputElement).value);
               if (Number.isFinite(v)) setAll((c) => { c.x = v; });
             }} />
      <span class="props-label">Y</span>
      <input class="props-input props-input-sm" type="number"
             value={commonY ?? ''} placeholder={commonY === undefined ? '—' : ''}
             oninput={(e) => {
               const v = Number((e.target as HTMLInputElement).value);
               if (Number.isFinite(v)) setAll((c) => { c.y = v; });
             }} />
    </div>
    <div class="props-row">
      <span class="props-label">W</span>
      <input class="props-input props-input-sm" type="number" min="10"
             value={commonW ?? ''} placeholder={commonW === undefined ? '—' : ''}
             oninput={(e) => {
               const v = Math.max(10, Number((e.target as HTMLInputElement).value));
               if (Number.isFinite(v)) setAll((c) => { c.width = v; });
             }} />
      <span class="props-label">H</span>
      <input class="props-input props-input-sm" type="number" min="10"
             value={commonH ?? ''} placeholder={commonH === undefined ? '—' : ''}
             oninput={(e) => {
               const v = Math.max(10, Number((e.target as HTMLInputElement).value));
               if (Number.isFinite(v)) setAll((c) => { c.height = v; });
             }} />
    </div>
    <div class="props-row">
      <span class="props-label">Rot°</span>
      <input class="props-input props-input-sm" type="number" min="0" max="360" step="1"
             value={commonRot ?? ''} placeholder={commonRot === undefined ? '—' : ''}
             oninput={(e) => {
               const v = Number((e.target as HTMLInputElement).value);
               if (Number.isFinite(v)) setAll((c) => { c.rotation = ((v % 360) + 360) % 360; });
             }} />
    </div>
    <div class="props-row">
      <span class="props-label">Lock</span>
      <input type="checkbox"
             checked={commonLocked === true}
             indeterminate={commonLocked === undefined}
             onchange={(e) => setAll((c) => { c.locked = (e.target as HTMLInputElement).checked; })} />
    </div>
  </CollapsibleSection>

  <CollapsibleSection title="Appearance">
    <div class="color-swatches">
      {#each swatchState.list as swatch}
        <div
          class="color-swatch"
          class:active={commonColor === swatch}
          style="background: {swatch};"
          title={swatch}
          onclick={() => setAll((c) => { c.color = swatch; })}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') setAll((c) => { c.color = swatch; }); }}
        ></div>
      {/each}
    </div>
    <div class="props-row">
      <span class="props-label">Color</span>
      <ColorField color={commonColor ?? '#FFB800'}
                  onchange={(hex) => setAll((c) => { c.color = hex; })} />
    </div>
    {#if multi && commonColor === undefined}
      <div class="props-hint">Selection has mixed colors — picking one applies to all.</div>
    {/if}
  </CollapsibleSection>

  {#if entry && entry.editableProperties.length > 0}
    <CollapsibleSection title="Parameters">
      {#each entry.editableProperties as prop}
        {#if !prop.showWhen || getProp(prop.showWhen.propPath) === prop.showWhen.equals}
        <div class="props-row">
          <span class="props-label">{prop.label}</span>
          {#if prop.type === 'checkbox'}
            <input type="checkbox" checked={getProp(prop.propPath || prop.key) as boolean}
                   onchange={(e) => setProp(prop.propPath || prop.key, (e.target as HTMLInputElement).checked)} />
          {:else if prop.type === 'number'}
            <input class="props-input props-input-sm" type="number"
                   value={getProp(prop.propPath || prop.key) as number}
                   min={prop.min} max={prop.max} step={prop.step}
                   oninput={(e) => {
                     let v = Number((e.target as HTMLInputElement).value);
                     if (prop.min !== undefined && v < prop.min) v = prop.min;
                     if (prop.max !== undefined && v > prop.max) v = prop.max;
                     setProp(prop.propPath || prop.key, v);
                   }} />
          {:else if prop.type === 'select' && prop.options}
            {@const isFontSelect = prop.key === 'fontFamily'}
            <select class="props-input"
                    value={getProp(prop.propPath || prop.key) as string}
                    style={isFontSelect ? `font-family: ${getProp(prop.propPath || prop.key) as string};` : ''}
                    onchange={(e) => setProp(prop.propPath || prop.key, (e.target as HTMLSelectElement).value)}>
              {#each prop.options as opt}
                <option value={opt.value} style={isFontSelect ? `font-family: ${opt.value};` : ''}>{opt.label}</option>
              {/each}
            </select>
          {:else if prop.type === 'color'}
            <ColorField color={(getProp(prop.propPath || prop.key) as string) || '#FFB800'}
                        onchange={(hex) => setProp(prop.propPath || prop.key, hex)} />
          {:else if prop.type === 'range'}
            <input type="range" min={prop.min ?? 0} max={prop.max ?? 100} step={prop.step ?? 1}
                   value={getProp(prop.propPath || prop.key) as number}
                   oninput={(e) => setProp(prop.propPath || prop.key, Number((e.target as HTMLInputElement).value))} />
            <span class="props-value">{getProp(prop.propPath || prop.key)}</span>
          {:else if prop.type === 'curve'}
            <button class="props-input"
                    disabled={!single}
                    onclick={() => { if (single) curveEditorOpen = true; }}>
              Edit curve…
            </button>
          {:else}
            <input class="props-input" type="text"
                   value={getProp(prop.propPath || prop.key) as string}
                   oninput={(e) => setProp(prop.propPath || prop.key, (e.target as HTMLInputElement).value)} />
          {/if}
        </div>
        {/if}
      {/each}
    </CollapsibleSection>
  {/if}

  {#if curveEditorOpen && single}
    <CurveEditor data={single} onclose={() => curveEditorOpen = false} />
  {/if}
  {#if single}
    <EffectsEditor data={single} />
  {:else if multi && allSameType}
    <div class="props-hint">Effects editor is single-select only.</div>
  {/if}

  <!-- Panel texture fill — only when a single panel_group is selected -->
  {#if single && single.type === 'panel_group'}
    {@const selected = single}
    <CollapsibleSection title="Image Fill" collapsed={!selected.properties.textureDataUrl}>
      {#if selected.properties.textureDataUrl}
        <img class="ref-thumb" src={selected.properties.textureDataUrl as string} alt="Texture" />
        <div class="props-row">
          <span class="props-label">Opacity</span>
          <input type="range" min="0" max="1" step="0.05"
                 value={(selected.properties.textureOpacity as number) ?? 0.8}
                 oninput={(e) => { selected.properties.textureOpacity = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
          <span class="props-value">{Math.round(((selected.properties.textureOpacity as number) ?? 0.8) * 100)}%</span>
        </div>
        <div class="props-row">
          <span class="props-label">Offset X</span>
          <input class="props-input props-input-sm" type="number"
                 value={(selected.properties.textureOffsetX as number) ?? 0}
                 oninput={(e) => { selected.properties.textureOffsetX = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
          <span class="props-label">Y</span>
          <input class="props-input props-input-sm" type="number"
                 value={(selected.properties.textureOffsetY as number) ?? 0}
                 oninput={(e) => { selected.properties.textureOffsetY = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
        </div>
        <div class="props-row">
          <span class="props-label">Scale</span>
          <input class="props-input props-input-sm" type="number"
                 min="0.1" max="10" step="0.1"
                 value={(selected.properties.textureScale as number) ?? 1}
                 oninput={(e) => { selected.properties.textureScale = +(e.target as HTMLInputElement).value; appState.isDirty = true; }} />
        </div>
        <div class="props-row">
          <span class="props-label">Blend</span>
          <select class="toolbar-select" style="flex:1;"
                  value={(selected.properties.textureBlend as string) || 'multiply'}
                  onchange={(e) => { selected.properties.textureBlend = (e.target as HTMLSelectElement).value; appState.isDirty = true; }}>
            <option value="multiply">Multiply</option>
            <option value="normal">Normal</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
          </select>
        </div>
        <div class="props-row">
          <button class="props-btn" onclick={loadPanelTexture}>Replace…</button>
          <button class="props-btn-danger"
                  onclick={() => { delete selected.properties.textureDataUrl; appState.isDirty = true; }}>
            Remove
          </button>
        </div>
      {:else}
        <div class="props-row">
          <button class="props-btn" style="flex:1;" onclick={loadPanelTexture}>Load Texture…</button>
        </div>
      {/if}
    </CollapsibleSection>
  {/if}

{:else}
  <!-- Workspaces — frame list with rename / new / duplicate / delete -->
  <CollapsibleSection title="Workspaces">
    <div class="ws-list">
      {#each appState.workspaces as ws (ws.id)}
        {@const isActive = ws.id === appState.activeWorkspaceId}
        <div class="ws-list-row" class:active={isActive}>
          {#if renamingWsId === ws.id}
            <!-- svelte-ignore a11y_autofocus -->
            <input class="ws-list-input"
                   type="text"
                   value={renameDraft}
                   oninput={(e) => renameDraft = (e.target as HTMLInputElement).value}
                   onblur={commitRename}
                   onkeydown={(e) => {
                     if (e.key === 'Enter') commitRename();
                     else if (e.key === 'Escape') { renamingWsId = null; renameDraft = ''; }
                   }}
                   autofocus />
          {:else}
            <button class="ws-list-name"
                    title={isActive ? `${ws.name} (active)` : `Switch to ${ws.name}`}
                    onclick={() => switchWorkspace(ws.id)}
                    ondblclick={() => beginRename(ws.id, ws.name)}>
              {ws.name}
            </button>
            <button class="ws-list-action"
                    title="Rename" aria-label="Rename"
                    onclick={() => beginRename(ws.id, ws.name)}>✎</button>
            {#if appState.workspaces.length > 1}
              <button class="ws-list-action ws-list-delete"
                      title="Delete" aria-label="Delete workspace"
                      onclick={() => {
                        if (confirm(`Delete workspace "${ws.name}"?`)) deleteWorkspace(ws.id);
                      }}>×</button>
            {/if}
          {/if}
        </div>
      {/each}
      <div class="ws-list-row ws-list-actions-row">
        <button class="ws-list-add" onclick={() => createWorkspace()} title="New workspace">+ New</button>
        <button class="ws-list-add" onclick={() => duplicateActiveWorkspace()} title="Duplicate active workspace">Duplicate</button>
      </div>
    </div>
  </CollapsibleSection>

  <!-- Canvas properties (nothing selected) -->
  <CollapsibleSection title="Canvas">
    <div class="props-row">
      <span class="props-label">W</span>
      <input class="props-input props-input-sm" type="number"
             min="100" max="4096" step="1"
             value={appState.canvasWidth}
             oninput={(e) => {
               const v = Math.max(100, Math.min(4096, Number((e.target as HTMLInputElement).value) || 100));
               appState.canvasWidth = v; appState.isDirty = true;
             }} />
      <span class="props-label">H</span>
      <input class="props-input props-input-sm" type="number"
             min="100" max="4096" step="1"
             value={appState.canvasHeight}
             oninput={(e) => {
               const v = Math.max(100, Math.min(4096, Number((e.target as HTMLInputElement).value) || 100));
               appState.canvasHeight = v; appState.isDirty = true;
             }} />
    </div>
    <div class="props-row">
      <span class="props-label">BG</span>
      <ColorField color={appState.bgColor}
                  onchange={(hex) => { appState.bgColor = hex; appState.isDirty = true; }} />
    </div>
  </CollapsibleSection>

  {#if appState.refImageDataUrl}
    <CollapsibleSection title="Reference Image">
      <img class="ref-thumb" src={appState.refImageDataUrl} alt="Reference" />
      <div class="props-row">
        <span class="props-label">Opacity</span>
        <input type="range" min="0.05" max="1" step="0.05"
               value={appState.refImageOpacity}
               oninput={(e) => { appState.refImageOpacity = +(e.target as HTMLInputElement).value; }} />
        <span class="props-value">{Math.round(appState.refImageOpacity * 100)}%</span>
      </div>
      <div class="props-row">
        <span class="props-label">Offset X</span>
        <input type="number" step="1"
               value={appState.refImageOffsetX}
               oninput={(e) => { appState.refImageOffsetX = +(e.target as HTMLInputElement).value || 0; appState.isDirty = true; }} />
      </div>
      <div class="props-row">
        <span class="props-label">Offset Y</span>
        <input type="number" step="1"
               value={appState.refImageOffsetY}
               oninput={(e) => { appState.refImageOffsetY = +(e.target as HTMLInputElement).value || 0; appState.isDirty = true; }} />
      </div>
      <div class="props-row">
        <button class="props-btn"
                onclick={() => { appState.refImageVisible = !appState.refImageVisible; }}>
          {appState.refImageVisible ? 'Hide' : 'Show'}
        </button>
        <button class="props-btn-danger"
                onclick={() => { appState.refImageDataUrl = null; appState.isDirty = true; }}>
          Remove
        </button>
      </div>
    </CollapsibleSection>
  {:else}
    <div class="ref-image-drop-hint">
      Drop an image onto the canvas<br/>or
      <button onclick={loadRefImageFromPanel}>Load Reference Image…</button>
    </div>
  {/if}
{/if}
