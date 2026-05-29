import { appState } from '../state/app.svelte.js';
import { select, addToSelection, clearSelection, isSelected, removeFromSelection } from '../state/selection.js';
import { createComponent, getComponentAtPoint } from '../state/actions.js';
import { screenToCanvas, snap } from '../utils/geometry.js';
import { pushHistory } from '../state/history.js';
import { expandSelection } from '../state/groups.js';
import { duplicateInPlace } from '../state/clipboard.js';
import { startInlineEdit, inlineEdit } from '../ui/inline-edit.svelte.js';
import { getTextPath } from '../components/text-fields.js';
import { getActiveWorkspace, switchWorkspace, duplicateActiveWorkspace } from '../state/workspaces.js';

type DragState = 'idle' | 'moving' | 'selecting' | 'resizing' | 'panning' | 'rotating';

let state: DragState = 'idle';
let startX = 0, startY = 0;
let movingStarts: { id: string; x: number; y: number }[] = [];
let altHeld = false;
let spaceHeld = false;
let hasMoved = false;
let resizeHandle: string | null = null;
let resizeStartBounds: { x: number; y: number; w: number; h: number } | null = null;
let resizeStartAspect = 1;
// Multi-resize: captured starts for all selected components and their union bbox.
// null = single-component resize (uses resizeStartBounds above).
let multiResizeStart: {
  bbox: { x: number; y: number; w: number; h: number };
  aspect: number;
  comps: Array<{ id: string; x: number; y: number; w: number; h: number }>;
} | null = null;

// Workspace (canvas) resize. We capture the active workspace's world position
// and dimensions so that top/left handles move the workspace's origin (rather
// than dragging the bottom-right edge), which is the natural "grow leftward"
// behaviour now that workspaces sit at their own world coordinates.
//
// Deltas are computed in *screen pixels* multiplied by the world-per-pixel
// ratio captured at drag start. Otherwise the viewBox grows as the workspace
// grows, world coords drift under a stationary cursor, and the resize runs
// away in one direction.
let workspaceResizeStart: {
  w: number;
  h: number;
  wsX: number;
  wsY: number;
  screenStartX: number;
  screenStartY: number;
  worldPerPxX: number;
  worldPerPxY: number;
} | null = null;

// Workspace frame drag (relocating a whole workspace by its header). Updates ws.x/ws.y.
let frameDragState: {
  wsId: string;
  startX: number;
  startY: number;
  startWsX: number;
  startWsY: number;
} | null = null;

/** Read the active workspace's world position (or 0,0 if no active workspace yet). */
function getActiveOffset(): { x: number; y: number } {
  const ws = getActiveWorkspace();
  return ws ? { x: ws.x, y: ws.y } : { x: 0, y: 0 };
}

/** Find the workspace whose rect contains the given world-space point, if any. */
function workspaceAtWorldPoint(px: number, py: number) {
  for (const ws of appState.workspaces) {
    const isActive = ws.id === appState.activeWorkspaceId;
    const w = isActive ? appState.canvasWidth : ws.canvasWidth;
    const h = isActive ? appState.canvasHeight : ws.canvasHeight;
    if (px >= ws.x && px <= ws.x + w && py >= ws.y && py <= ws.y + h) return ws;
  }
  return null;
}
let movingIds: string[] = [];
let ctrlDuplicatePending = false;
let panStartX = 0, panStartY = 0;
let panStartVBX = 0, panStartVBY = 0;
let rubberBand = $state<{ x: number; y: number; w: number; h: number } | null>(null);

// Rotation drag state
let rotatingId: string | null = null;
let rotateCx = 0, rotateCy = 0;
let rotateStartAngle = 0;
let rotateStartValue = 0;
let activeRotation = $state<number | null>(null);

// Snap guide overlay — populated during move/resize when alignment snap fires.
export type SnapGuide = { axis: 'x' | 'y'; position: number };
let snapGuides = $state<SnapGuide[]>([]);

// Equal-spacing guides — Figma/Kittl style. Each guide carries two segments of
// equal length on the same axis; both render in magenta so the user can see the
// "these gaps are equal" relationship at a glance. cross = perpendicular position
// where the segment line is drawn (e.g. for axis='x', cross is the Y).
export type EqualSpacingSegment = { from: number; to: number; cross: number };
export type EqualSpacingGuide = { axis: 'x' | 'y'; segments: EqualSpacingSegment[] };
let equalSpacingGuides = $state<EqualSpacingGuide[]>([]);
export function getEqualSpacingGuides() { return equalSpacingGuides; }

export function getRubberBand() { return rubberBand; }
export function getActiveRotation() { return activeRotation; }
export function getSnapGuides(): SnapGuide[] { return snapGuides; }

function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------
// Equal-spacing snap detection. Figma/Kittl-style: when dragging element D, if
// D's gap to a neighbor matches a gap between two OTHER elements on the same
// row/column, snap to that exact distance and surface both equal segments for
// the SnapGuides overlay to draw in magenta.
//
// `axis: 'x'` detects horizontal spacing among elements that vertically overlap
// D (i.e. the same row); `axis: 'y'` is the transpose.
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; w: number; h: number };

function detectEqualSpacing(
  axis: 'x' | 'y',
  d: Box,
  others: Box[],
  threshold: number,
): { delta: number; guide: EqualSpacingGuide } | null {
  // Helpers that fold axis selection — `along` is the primary axis, `cross` is
  // the perpendicular one. For axis='x', along=x/w, cross=y/h.
  const along = (b: Box) => axis === 'x' ? b.x : b.y;
  const alongSize = (b: Box) => axis === 'x' ? b.w : b.h;
  const cross = (b: Box) => axis === 'x' ? b.y : b.x;
  const crossSize = (b: Box) => axis === 'x' ? b.h : b.w;

  // Aligned set: components whose perpendicular bounds overlap D's enough to
  // count as "same row" / "same column". Threshold is 4px for normal-size
  // components but relaxes to 30% of the smaller cross-dimension when either
  // element is tiny (e.g. 8px buttons) — otherwise the absolute floor swallows
  // small-button rows entirely and gap snap silently never fires.
  const aligned = others.filter(o => {
    const overlap = Math.min(cross(o) + crossSize(o), cross(d) + crossSize(d))
                  - Math.max(cross(o), cross(d));
    const minOverlap = Math.min(4, Math.min(crossSize(o), crossSize(d)) * 0.3);
    return overlap > minOverlap;
  }).sort((a, b) => along(a) - along(b));

  if (aligned.length < 1) return null;

  let best: { delta: number; guide: EqualSpacingGuide } | null = null;

  // Build the perpendicular position where guide segments will render —
  // midpoint of the involved elements' cross extents, so guides sit visually
  // between/on the row of components.
  function segCross(boxes: Box[]): number {
    const lo = Math.max(...boxes.map(cross));
    const hi = Math.min(...boxes.map(b => cross(b) + crossSize(b)));
    return (lo + hi) / 2;
  }

  function segment(loBoxAlongEnd: number, hiBoxAlongStart: number, crossVal: number): EqualSpacingSegment {
    return { from: loBoxAlongEnd, to: hiBoxAlongStart, cross: crossVal };
  }

  // Single-neighbor case: no pair exists, so we can't infer a user-intended
  // spacing from the canvas. Snap to a library of conventional UI pixel
  // spacings instead — typical button-row gaps used in plugin mockups.
  if (aligned.length === 1) {
    const COMMON_SPACINGS = [4, 8, 12, 16, 20, 24, 32, 40];
    const A = aligned[0];
    const dSize = alongSize(d);
    const dAlong = along(d);
    const crossPos = segCross([A, d]);
    for (const spacing of COMMON_SPACINGS) {
      // D after A: gap runs from A's far edge to D's near edge.
      const targetAfter = along(A) + alongSize(A) + spacing;
      // D before A: gap runs from D's far edge to A's near edge.
      const targetBefore = along(A) - spacing - dSize;
      const tries: Array<{ target: number; from: number; to: number }> = [
        { target: targetAfter,  from: along(A) + alongSize(A), to: targetAfter },
        { target: targetBefore, from: targetBefore + dSize,    to: along(A) },
      ];
      for (const t of tries) {
        const delta = t.target - dAlong;
        if (Math.abs(delta) > threshold) continue;
        if (best && Math.abs(delta) >= Math.abs(best.delta)) continue;
        best = { delta, guide: { axis, segments: [segment(t.from, t.to, crossPos)] } };
      }
    }
    return best;
  }

  for (let i = 0; i < aligned.length - 1; i++) {
    const A = aligned[i];
    const B = aligned[i + 1];
    const gap = along(B) - (along(A) + alongSize(A));
    if (gap <= 0) continue; // overlapping pair — not a usable spacing

    // Candidates expressed as the target value for `along(d)`:
    //   extR: D after B (extend pair rightward) — D.along = B.along + B.size + gap
    //   extL: D before A (extend pair leftward) — D.along = A.along - gap - D.size
    //   fill: D between A and B — D.along = A.along + A.size + (gap - D.size) / 2
    const dSize = alongSize(d);
    const dAlong = along(d);
    const candidates: Array<{ target: number; kind: 'extR' | 'extL' | 'fill' }> = [
      { target: along(B) + alongSize(B) + gap,       kind: 'extR' },
      { target: along(A) - gap - dSize,              kind: 'extL' },
    ];
    if (gap > dSize + 2) {
      candidates.push({ target: along(A) + alongSize(A) + (gap - dSize) / 2, kind: 'fill' });
    }

    for (const cand of candidates) {
      const delta = cand.target - dAlong;
      if (Math.abs(delta) > threshold) continue;
      if (best && Math.abs(delta) >= Math.abs(best.delta)) continue;

      // Build both equal segments for the visual.
      let seg1: EqualSpacingSegment, seg2: EqualSpacingSegment;
      const crossPos = segCross([A, B, d]);
      const dEndAtCand = cand.target + dSize;

      if (cand.kind === 'extR') {
        seg1 = segment(along(A) + alongSize(A), along(B), crossPos);
        seg2 = segment(along(B) + alongSize(B), cand.target, crossPos);
      } else if (cand.kind === 'extL') {
        seg1 = segment(along(A) + alongSize(A), along(B), crossPos);
        seg2 = segment(dEndAtCand, along(A), crossPos);
      } else { // fill
        seg1 = segment(along(A) + alongSize(A), cand.target, crossPos);
        seg2 = segment(dEndAtCand, along(B), crossPos);
      }

      best = { delta, guide: { axis, segments: [seg1, seg2] } };
    }
  }

  return best;
}

export function initDrag(svgEl: SVGSVGElement, containerEl: HTMLElement): () => void {
  function onDoubleClick(e: MouseEvent) {
    if (e.button !== 0) return;
    // Workspace header double-click → inline rename.
    const headerEl = (e.target as Element).closest?.('[data-workspace-header]');
    if (headerEl) {
      const wsId = headerEl.getAttribute('data-workspace-header')!;
      const ws = appState.workspaces.find(w => w.id === wsId);
      if (ws) {
        appState.renamingWorkspaceId = ws.id;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    const ptWorld = screenToCanvas(svgEl, e.clientX, e.clientY);
    const off = getActiveOffset();
    const pt = { x: ptWorld.x - off.x, y: ptWorld.y - off.y };
    const clicked = getComponentAtPoint(pt.x, pt.y);
    if (clicked && getTextPath(clicked.type)) {
      select(clicked.id);
      startInlineEdit(clicked.id);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onMouseDown(e: MouseEvent) {
    // Swallow canvas interactions while inline-editing text so clicks inside the
    // editor (or outside it) don't start drags/rubber-bands. The blur on the
    // input commits the edit.
    if (inlineEdit.componentId) return;
    if (e.button === 1) {
      // Middle-click pan
      e.preventDefault();
      state = 'panning';
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartVBX = appState.panX;
      panStartVBY = appState.panY;
      containerEl.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    // Space+click = pan
    if (spaceHeld) {
      state = 'panning';
      panStartX = e.clientX;
      panStartY = e.clientY;
      panStartVBX = appState.panX;
      panStartVBY = appState.panY;
      containerEl.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }

    const ptWorld = screenToCanvas(svgEl, e.clientX, e.clientY);

    // Workspace frame header — selects the workspace as an entity + starts
    // optional drag-to-move. Ctrl/Cmd or Alt held = copy-drag (duplicate first,
    // then drag the duplicate from the original's location).
    const headerEl = (e.target as Element).closest?.('[data-workspace-header]');
    if (headerEl) {
      const wsId = headerEl.getAttribute('data-workspace-header')!;
      const ws = appState.workspaces.find(w => w.id === wsId);
      if (ws) {
        if (wsId !== appState.activeWorkspaceId) switchWorkspace(wsId);
        const copyDrag = e.ctrlKey || e.metaKey || e.altKey;
        if (copyDrag) {
          // Duplicate the workspace, place the copy at the original's position,
          // and start dragging the copy. Releasing without movement leaves the
          // duplicate stacked exactly on top — user can move it next.
          const dup = duplicateActiveWorkspace();
          if (dup) {
            dup.x = ws.x;
            dup.y = ws.y;
          }
        }
        // Clear component selection — the workspace is now the "selected entity"
        // for Ctrl+C / Ctrl+V / Delete.
        appState.selectedIds = [];
        appState.selectedWorkspaceId = appState.activeWorkspaceId;
        const active = getActiveWorkspace();
        if (active) {
          state = 'moving';
          pushHistory();
          frameDragState = {
            wsId: active.id,
            startX: ptWorld.x,
            startY: ptWorld.y,
            startWsX: active.x,
            startWsY: active.y,
          };
          movingIds = [];
          hasMoved = false;
        }
        e.preventDefault();
        return;
      }
    }

    // Active workspace local coords (component coords are workspace-local).
    const off = getActiveOffset();
    const pt = { x: ptWorld.x - off.x, y: ptWorld.y - off.y };

    // Check rotation handle (must come before resize handle check)
    const rotHandleEl = (e.target as Element).closest?.('[data-rotate-handle]');
    if (rotHandleEl) {
      const selFor = (rotHandleEl as Element).closest('[data-selection-for]');
      if (selFor) {
        const compId = selFor.getAttribute('data-selection-for')!;
        const comp = appState.components.find(c => c.id === compId);
        if (comp && !comp.locked) {
          state = 'rotating';
          pushHistory();
          rotatingId = compId;
          rotateCx = comp.x + comp.width / 2;
          rotateCy = comp.y + comp.height / 2;
          rotateStartAngle = Math.atan2(pt.y - rotateCy, pt.x - rotateCx) * 180 / Math.PI;
          rotateStartValue = comp.rotation || 0;
          activeRotation = rotateStartValue;
          hasMoved = false;
          e.preventDefault();
          return;
        }
      }
    }

    // Check resize handle
    const handleEl = (e.target as Element).closest?.('[data-handle]');
    if (handleEl) {
      const selFor = handleEl.closest('[data-selection-for]');
      if (selFor) {
        const compId = selFor.getAttribute('data-selection-for')!;

        if (compId === '__workspace__') {
          // Workspace (canvas) resize via the handles around the workspace rect.
          const activeWs = getActiveWorkspace();
          if (!activeWs) return;
          // Snapshot the world-per-pixel ratio so cursor deltas stay consistent
          // even as the viewBox grows with the workspace. Without this, growing
          // the workspace makes the same screen X map to a larger world X each
          // frame, which feeds the resize and runs away in one direction.
          const ctm = svgEl.getScreenCTM();
          const inv = ctm?.inverse();
          const worldPerPxX = inv ? Math.abs(inv.a) : 1;
          const worldPerPxY = inv ? Math.abs(inv.d) : 1;
          state = 'resizing';
          pushHistory();
          resizeHandle = handleEl.getAttribute('data-handle');
          resizeStartBounds = { x: 0, y: 0, w: appState.canvasWidth, h: appState.canvasHeight };
          resizeStartAspect = appState.canvasHeight > 0 ? appState.canvasWidth / appState.canvasHeight : 1;
          multiResizeStart = null;
          workspaceResizeStart = {
            w: appState.canvasWidth,
            h: appState.canvasHeight,
            wsX: activeWs.x,
            wsY: activeWs.y,
            screenStartX: e.clientX,
            screenStartY: e.clientY,
            worldPerPxX,
            worldPerPxY,
          };
          startX = pt.x;
          startY = pt.y;
          movingIds = [];
          hasMoved = false;
          e.preventDefault();
          return;
        }

        if (compId === '__multi__') {
          // Multi-selection union-bbox resize. Capture every unlocked component's
          // start bounds plus the union bbox, then scale them all proportionally.
          const selected = appState.selectedIds
            .map(id => appState.components.find(c => c.id === id))
            .filter((c): c is NonNullable<typeof c> => c != null && !c.locked);
          if (selected.length < 2) return;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const c of selected) {
            minX = Math.min(minX, c.x);
            minY = Math.min(minY, c.y);
            maxX = Math.max(maxX, c.x + c.width);
            maxY = Math.max(maxY, c.y + c.height);
          }
          const bw = maxX - minX, bh = maxY - minY;
          if (bw <= 0 || bh <= 0) return;
          state = 'resizing';
          pushHistory();
          resizeHandle = handleEl.getAttribute('data-handle');
          resizeStartBounds = { x: minX, y: minY, w: bw, h: bh };
          resizeStartAspect = bw / bh;
          multiResizeStart = {
            bbox: { x: minX, y: minY, w: bw, h: bh },
            aspect: bw / bh,
            comps: selected.map(c => ({ id: c.id, x: c.x, y: c.y, w: c.width, h: c.height })),
          };
          startX = pt.x;
          startY = pt.y;
          movingIds = selected.map(c => c.id);
          hasMoved = false;
          e.preventDefault();
          return;
        }

        const comp = appState.components.find(c => c.id === compId);
        if (comp && !comp.locked) {
          state = 'resizing';
          pushHistory();
          resizeHandle = handleEl.getAttribute('data-handle');
          resizeStartBounds = { x: comp.x, y: comp.y, w: comp.width, h: comp.height };
          resizeStartAspect = comp.height > 0 ? comp.width / comp.height : 1;
          multiResizeStart = null;
          startX = pt.x;
          startY = pt.y;
          movingIds = [compId];
          hasMoved = false;
          e.preventDefault();
          return;
        }
      }
    }

    // Placement mode — only valid inside the active workspace bounds.
    if (appState.placingType) {
      const snapped = snap(pt.x, pt.y);
      const data = createComponent(appState.placingType, snapped.x, snapped.y);
      if (data) {
        select(data.id);
      }
      appState.placingType = null;
      e.preventDefault();
      return;
    }

    // Component hit-test runs FIRST — components are workspace-local but can
    // sit outside the workspace's rect (e.g. after the workspace was resized
    // smaller, or after a paste that drifted them out). If a component is hit
    // we always treat the click as a component click, regardless of which
    // workspace's rect contains the cursor.
    const clicked = getComponentAtPoint(pt.x, pt.y);

    if (!clicked) {
      // No component under cursor. Decide between workspace switch and rubber-band.
      const clickedWs = workspaceAtWorldPoint(ptWorld.x, ptWorld.y);
      if (clickedWs && clickedWs.id !== appState.activeWorkspaceId) {
        switchWorkspace(clickedWs.id);
        e.preventDefault();
        return;
      }
      // Either inside the active workspace's rect OR in the gutter beyond it —
      // either way we fall through to the rubber-band. Components can drift
      // outside the workspace rect (resize-shrink, paste-offset, etc.) and
      // need to remain reachable via box-select.
    }
    if (clicked) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.shiftKey) {
        if (isSelected(clicked.id)) {
          removeFromSelection(clicked.id);
        } else {
          addToSelection(clicked.id);
        }
      } else if (!isSelected(clicked.id)) {
        select(clicked.id);
      }

      // Locked components can still be selected (to unlock them) but not moved.
      if (clicked.locked) {
        hasMoved = false;
        e.preventDefault();
        return;
      }

      state = 'moving';
      pushHistory();
      startX = pt.x;
      startY = pt.y;
      ctrlDuplicatePending = ctrl;
      // Expand selection to include group members
      movingIds = expandSelection([...appState.selectedIds]);
      appState.selectedIds = movingIds;
      movingStarts = movingIds
        .map(id => appState.components.find(c => c.id === id))
        .filter(c => c != null && !c.locked)
        .map(c => ({ id: c!.id, x: c!.x, y: c!.y }));
      hasMoved = false;
      e.preventDefault();
      return;
    }

    // Empty area — rubber-band select
    clearSelection();
    state = 'selecting';
    startX = pt.x;
    startY = pt.y;
    hasMoved = false;
    rubberBand = { x: pt.x, y: pt.y, w: 0, h: 0 };
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (state === 'idle') return;

    if (state === 'panning') {
      const pdx = e.clientX - panStartX;
      const pdy = e.clientY - panStartY;
      const vbW = appState.canvasWidth / appState.zoom;
      const scale = vbW / svgEl.clientWidth;
      appState.panX = panStartVBX - pdx * scale;
      appState.panY = panStartVBY - pdy * scale;
      return;
    }

    const ptWorld = screenToCanvas(svgEl, e.clientX, e.clientY);

    // Workspace frame relocation (dragging the workspace header).
    if (frameDragState) {
      const fd = frameDragState;
      const ws = appState.workspaces.find(w => w.id === fd.wsId);
      if (ws) {
        hasMoved = true;
        const dx = ptWorld.x - fd.startX;
        const dy = ptWorld.y - fd.startY;
        let newX = fd.startWsX + dx;
        let newY = fd.startWsY + dy;
        // Snap frame to grid when snap is on (matches component snap UX).
        if (appState.snapEnabled && !altHeld) {
          const g = appState.gridSize;
          newX = Math.round(newX / g) * g;
          newY = Math.round(newY / g) * g;
        }
        ws.x = newX;
        ws.y = newY;
        appState.isDirty = true;
      }
      return;
    }

    // Translate to active workspace local coords for component operations.
    const off = getActiveOffset();
    const pt = { x: ptWorld.x - off.x, y: ptWorld.y - off.y };

    if (state === 'moving') {
      // Ctrl+drag: on first move, duplicate originals in-place and move copies
      if (ctrlDuplicatePending && !hasMoved) {
        ctrlDuplicatePending = false;
        const copyIds = duplicateInPlace(movingIds);
        // Originals stay; switch to moving the copies
        movingIds = copyIds;
        appState.selectedIds = copyIds;
        movingStarts = copyIds
          .map(id => appState.components.find(c => c.id === id))
          .filter(c => c != null)
          .map(c => ({ id: c.id, x: c.x, y: c.y }));
      }
      hasMoved = true;
      const dx = pt.x - startX;
      const dy = pt.y - startY;

      // Compute group-wide alignment snap delta from the first moving component.
      // Candidates: left/center/right x and top/center/bottom y of all non-moving components.
      let alignDx: number | null = null, alignDy: number | null = null;
      let guideX: number | null = null, guideY: number | null = null;
      if (!altHeld && movingStarts.length > 0) {
        const movingSet = new Set(movingIds);
        const ref = movingStarts[0];
        const refComp = appState.components.find(c => c.id === ref.id);
        if (refComp) {
          const w = refComp.width, h = refComp.height;
          const targetX = ref.x + dx;
          const targetY = ref.y + dy;
          const threshold = 6 / appState.zoom;

          const xCandidates: number[] = [];
          const yCandidates: number[] = [];
          for (const c of appState.components) {
            if (movingSet.has(c.id)) continue;
            xCandidates.push(c.x, c.x + c.width / 2, c.x + c.width);
            yCandidates.push(c.y, c.y + c.height / 2, c.y + c.height);
          }

          const refXs = [targetX, targetX + w / 2, targetX + w];
          const refYs = [targetY, targetY + h / 2, targetY + h];
          let bestDx = Infinity, bestDy = Infinity;
          for (const rx of refXs) {
            for (const cx of xCandidates) {
              const d = cx - rx;
              if (Math.abs(d) < Math.abs(bestDx) && Math.abs(d) <= threshold) {
                bestDx = d;
                guideX = cx;
              }
            }
          }
          for (const ry of refYs) {
            for (const cy of yCandidates) {
              const d = cy - ry;
              if (Math.abs(d) < Math.abs(bestDy) && Math.abs(d) <= threshold) {
                bestDy = d;
                guideY = cy;
              }
            }
          }
          if (bestDx !== Infinity) alignDx = bestDx;
          if (bestDy !== Infinity) alignDy = bestDy;
        }
      }

      const nextGuides: SnapGuide[] = [];
      if (guideX !== null) nextGuides.push({ axis: 'x', position: guideX });
      if (guideY !== null) nextGuides.push({ axis: 'y', position: guideY });
      snapGuides = nextGuides;

      // Equal-spacing snap — only on axes where edge-alignment didn't already
      // win. Edge alignment is a "stronger" intent (aligning edges directly)
      // so equal spacing yields. Build the dragged box fresh per axis with any
      // already-applied snap deltas folded in.
      const nextEqGuides: EqualSpacingGuide[] = [];
      if (!altHeld && movingStarts.length > 0) {
        const movingSet = new Set(movingIds);
        const ref = movingStarts[0];
        const refComp = appState.components.find(c => c.id === ref.id);
        if (refComp) {
          const w = refComp.width, h = refComp.height;
          const threshold = 6 / appState.zoom;
          const others: Box[] = [];
          for (const c of appState.components) {
            if (movingSet.has(c.id)) continue;
            others.push({ x: c.x, y: c.y, w: c.width, h: c.height });
          }
          const makeBox = (): Box => ({
            x: ref.x + dx + (alignDx ?? 0),
            y: ref.y + dy + (alignDy ?? 0),
            w, h,
          });
          if (alignDx === null) {
            const r = detectEqualSpacing('x', makeBox(), others, threshold);
            if (r) {
              alignDx = r.delta;
              nextEqGuides.push(r.guide);
            }
          }
          if (alignDy === null) {
            const r = detectEqualSpacing('y', makeBox(), others, threshold);
            if (r) {
              alignDy = r.delta;
              nextEqGuides.push(r.guide);
            }
          }
        }
      }
      equalSpacingGuides = nextEqGuides;

      // Compute grid-snap delta ONCE from the reference component (movingStarts[0])
      // so multi-select drags stay rigid. Per-element grid snap rounds each item
      // to its own nearest grid point and items drift apart.
      let snapDx: number = alignDx ?? 0;
      let snapDy: number = alignDy ?? 0;
      if (!altHeld && movingStarts.length > 0 && (alignDx === null || alignDy === null)) {
        const ref = movingStarts[0];
        const refGridSnapped = snap(ref.x + dx, ref.y + dy);
        if (alignDx === null) snapDx = refGridSnapped.x - (ref.x + dx);
        if (alignDy === null) snapDy = refGridSnapped.y - (ref.y + dy);
      }
      for (const start of movingStarts) {
        const comp = appState.components.find(c => c.id === start.id);
        if (!comp) continue;
        if (altHeld) {
          comp.x = start.x + dx;
          comp.y = start.y + dy;
        } else {
          comp.x = start.x + dx + snapDx;
          comp.y = start.y + dy + snapDy;
        }
      }
    } else if (state === 'selecting' && rubberBand) {
      hasMoved = true;
      rubberBand = {
        x: Math.min(startX, pt.x),
        y: Math.min(startY, pt.y),
        w: Math.abs(pt.x - startX),
        h: Math.abs(pt.y - startY),
      };
    } else if (state === 'rotating' && rotatingId) {
      hasMoved = true;
      const currentAngle = Math.atan2(pt.y - rotateCy, pt.x - rotateCx) * 180 / Math.PI;
      const delta = currentAngle - rotateStartAngle;
      let newRotation = normalizeAngle(rotateStartValue + delta);
      if (e.shiftKey) {
        newRotation = Math.round(newRotation / 15) * 15;
      }
      const comp = appState.components.find(c => c.id === rotatingId);
      if (comp) {
        comp.rotation = newRotation;
        activeRotation = newRotation;
      }
    } else if (state === 'resizing' && resizeStartBounds && resizeHandle) {
      hasMoved = true;
      const rdx = pt.x - startX;
      const rdy = pt.y - startY;
      const b = resizeStartBounds;
      let newX = b.x, newY = b.y, newW = b.w, newH = b.h;

      // For multi-resize the bbox needs a larger minimum so individual components
      // don't get crushed below their 10px floor. Single-resize keeps its 10px min.
      const minDim = multiResizeStart ? 20 : 10;
      if (resizeHandle.includes('r')) { newW = Math.max(minDim, b.w + rdx); }
      if (resizeHandle.includes('l')) { newW = Math.max(minDim, b.w - rdx); newX = b.x + b.w - newW; }
      if (resizeHandle.includes('b')) { newH = Math.max(minDim, b.h + rdy); }
      if (resizeHandle.includes('t')) { newH = Math.max(minDim, b.h - rdy); newY = b.y + b.h - newH; }

      // Shift: constrain aspect ratio on corner handles
      const isCorner = (resizeHandle.includes('t') || resizeHandle.includes('b'))
                    && (resizeHandle.includes('l') || resizeHandle.includes('r'));
      if (e.shiftKey && isCorner) {
        if (Math.abs(newW - b.w) >= Math.abs(newH - b.h)) {
          newH = Math.max(minDim, newW / resizeStartAspect);
          if (resizeHandle.includes('t')) newY = b.y + b.h - newH;
        } else {
          newW = Math.max(minDim, newH * resizeStartAspect);
          if (resizeHandle.includes('l')) newX = b.x + b.w - newW;
        }
      }

      // Workspace resize. With workspaces now living at their own (ws.x, ws.y) world
      // position, top/left handles can move the origin (the handle stays under the
      // cursor) while bottom/right handles extend the far edge — components are
      // workspace-local so they stay put relative to the top-left.
      if (workspaceResizeStart) {
        const minDimWs = 100;
        const start = workspaceResizeStart;
        const activeWs = getActiveWorkspace();
        if (!activeWs) return;
        // Screen-pixel deltas multiplied by the world-per-pixel ratio captured
        // at drag start. This keeps deltas stable even though the viewBox is
        // changing every frame as we update appState.canvasWidth/Height.
        const cdx = (e.clientX - start.screenStartX) * start.worldPerPxX;
        const cdy = (e.clientY - start.screenStartY) * start.worldPerPxY;

        let finalW = start.w, finalH = start.h;
        let finalWsX = start.wsX, finalWsY = start.wsY;

        if (resizeHandle.includes('r')) finalW = Math.max(minDimWs, start.w + cdx);
        if (resizeHandle.includes('l')) {
          const newW = Math.max(minDimWs, start.w - cdx);
          finalWsX = start.wsX + (start.w - newW);  // origin moves with the left edge
          finalW = newW;
        }
        if (resizeHandle.includes('b')) finalH = Math.max(minDimWs, start.h + cdy);
        if (resizeHandle.includes('t')) {
          const newH = Math.max(minDimWs, start.h - cdy);
          finalWsY = start.wsY + (start.h - newH);
          finalH = newH;
        }

        if (appState.snapEnabled && !altHeld) {
          const g = appState.gridSize;
          if (resizeHandle.includes('l')) {
            const snappedX = Math.round(finalWsX / g) * g;
            finalW = Math.max(minDimWs, finalW + (finalWsX - snappedX));
            finalWsX = snappedX;
          } else if (resizeHandle.includes('r')) {
            const right = finalWsX + finalW;
            finalW = Math.max(minDimWs, Math.round(right / g) * g - finalWsX);
          }
          if (resizeHandle.includes('t')) {
            const snappedY = Math.round(finalWsY / g) * g;
            finalH = Math.max(minDimWs, finalH + (finalWsY - snappedY));
            finalWsY = snappedY;
          } else if (resizeHandle.includes('b')) {
            const bottom = finalWsY + finalH;
            finalH = Math.max(minDimWs, Math.round(bottom / g) * g - finalWsY);
          }
        }

        appState.canvasWidth = Math.max(minDimWs, Math.round(finalW));
        appState.canvasHeight = Math.max(minDimWs, Math.round(finalH));
        activeWs.x = Math.round(finalWsX);
        activeWs.y = Math.round(finalWsY);
        appState.isDirty = true;
        snapGuides = [];
        return;
      }

      // Multi-resize: scale every captured component proportionally relative to the bbox.
      // Skip the per-edge grid/alignment snap below — it's geared at single-component edges
      // and would distort the proportional scale across the group.
      if (multiResizeStart) {
        const start = multiResizeStart;
        const sx = newW / start.bbox.w;
        const sy = newH / start.bbox.h;
        for (const s of start.comps) {
          const comp = appState.components.find(c => c.id === s.id);
          if (!comp) continue;
          const relX = s.x - start.bbox.x;
          const relY = s.y - start.bbox.y;
          comp.x = newX + relX * sx;
          comp.y = newY + relY * sy;
          comp.width = Math.max(10, Math.round(s.w * sx));
          comp.height = Math.max(10, Math.round(s.h * sy));
        }
        snapGuides = [];
        return;
      }

      // Snap only the moving edges — snapping the anchored edge would shift the whole item.
      // Alt disables snapping for pixel-perfect resize.
      let resizeGuideX: number | null = null, resizeGuideY: number | null = null;
      if (appState.snapEnabled && !altHeld) {
        // Alignment snap to other components' edges/centers takes precedence over grid.
        const movingSet = new Set(movingIds);
        const threshold = 6 / appState.zoom;
        const xCandidates: number[] = [];
        const yCandidates: number[] = [];
        for (const c of appState.components) {
          if (movingSet.has(c.id)) continue;
          xCandidates.push(c.x, c.x + c.width / 2, c.x + c.width);
          yCandidates.push(c.y, c.y + c.height / 2, c.y + c.height);
        }
        const movingLeft   = resizeHandle.includes('l');
        const movingRight  = resizeHandle.includes('r');
        const movingTop    = resizeHandle.includes('t');
        const movingBottom = resizeHandle.includes('b');

        function nearestCandidate(value: number, cands: number[]): { d: number; target: number } | null {
          let best: { d: number; target: number } | null = null;
          for (const cv of cands) {
            const d = cv - value;
            if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best.d))) {
              best = { d, target: cv };
            }
          }
          return best;
        }

        // X axis: snap only the moving edge
        let xSnap: { d: number; target: number } | null = null;
        if (movingLeft)  xSnap = nearestCandidate(newX, xCandidates);
        if (movingRight) xSnap = nearestCandidate(newX + newW, xCandidates);
        if (xSnap) {
          if (movingLeft)  { newW = Math.max(10, newW - xSnap.d); newX += xSnap.d; }
          if (movingRight) { newW = Math.max(10, newW + xSnap.d); }
          resizeGuideX = xSnap.target;
        } else {
          // Fall back to grid snap on moving X edge
          const g = appState.gridSize;
          if (movingLeft) {
            const sx = Math.round(newX / g) * g;
            newW = Math.max(10, newW + (newX - sx));
            newX = sx;
          } else if (movingRight) {
            const right = newX + newW;
            newW = Math.max(10, Math.round(right / g) * g - newX);
          }
        }

        // Y axis: snap only the moving edge
        let ySnap: { d: number; target: number } | null = null;
        if (movingTop)    ySnap = nearestCandidate(newY, yCandidates);
        if (movingBottom) ySnap = nearestCandidate(newY + newH, yCandidates);
        if (ySnap) {
          if (movingTop)    { newH = Math.max(10, newH - ySnap.d); newY += ySnap.d; }
          if (movingBottom) { newH = Math.max(10, newH + ySnap.d); }
          resizeGuideY = ySnap.target;
        } else {
          const g = appState.gridSize;
          if (movingTop) {
            const sy = Math.round(newY / g) * g;
            newH = Math.max(10, newH + (newY - sy));
            newY = sy;
          } else if (movingBottom) {
            const bottom = newY + newH;
            newH = Math.max(10, Math.round(bottom / g) * g - newY);
          }
        }
      }

      const nextResizeGuides: SnapGuide[] = [];
      if (resizeGuideX !== null) nextResizeGuides.push({ axis: 'x', position: resizeGuideX });
      if (resizeGuideY !== null) nextResizeGuides.push({ axis: 'y', position: resizeGuideY });
      snapGuides = nextResizeGuides;
      const comp = appState.components.find(c => c.id === movingIds[0]);
      if (comp) {
        comp.x = newX;
        comp.y = newY;
        comp.width = Math.round(newW);
        comp.height = Math.round(newH);
      }
    }
  }

  function onMouseUp(_e: MouseEvent) {
    if (state === 'panning') {
      state = 'idle';
      containerEl.style.cursor = spaceHeld ? 'grab' : '';
      return;
    }
    if (state === 'selecting' && rubberBand && hasMoved) {
      const rb = rubberBand;
      const selected: string[] = [];
      for (const c of appState.components) {
        if (c.x + c.width > rb.x && c.x < rb.x + rb.w &&
            c.y + c.height > rb.y && c.y < rb.y + rb.h) {
          selected.push(c.id);
        }
      }
      appState.selectedIds = selected;
    }
    if (state === 'moving' && hasMoved) {
      appState.isDirty = true;
    }
    if (state === 'resizing' && hasMoved) {
      appState.isDirty = true;
    }
    if (state === 'rotating' && hasMoved) {
      appState.isDirty = true;
    }

    state = 'idle';
    movingIds = [];
    movingStarts = [];
    ctrlDuplicatePending = false;
    resizeHandle = null;
    resizeStartBounds = null;
    multiResizeStart = null;
    workspaceResizeStart = null;
    frameDragState = null;
    rubberBand = null;
    rotatingId = null;
    activeRotation = null;
    snapGuides = [];
    equalSpacingGuides = [];
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Alt') altHeld = true;
    if (e.key === ' ' && (e.target as Element).tagName !== 'INPUT' && (e.target as Element).tagName !== 'TEXTAREA') {
      e.preventDefault();
      spaceHeld = true;
      containerEl.style.cursor = 'grab';
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'Alt') altHeld = false;
    if (e.key === ' ') {
      spaceHeld = false;
      if (state !== 'panning') containerEl.style.cursor = '';
    }
  }

  function onWheel(e: WheelEvent) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.25, Math.min(4, appState.zoom + delta));

      // Zoom toward cursor
      const rect = svgEl.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      const oldVBW = appState.canvasWidth / appState.zoom;
      const oldVBH = appState.canvasHeight / appState.zoom;
      const newVBW = appState.canvasWidth / newZoom;
      const newVBH = appState.canvasHeight / newZoom;

      appState.panX += (oldVBW - newVBW) * mx;
      appState.panY += (oldVBH - newVBH) * my;
      appState.zoom = newZoom;
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    const ptWorld = screenToCanvas(svgEl, e.clientX, e.clientY);
    const off = getActiveOffset();
    const pt = { x: ptWorld.x - off.x, y: ptWorld.y - off.y };
    const comp = getComponentAtPoint(pt.x, pt.y);
    if (comp && !isSelected(comp.id)) {
      select(comp.id);
    }
    window.dispatchEvent(new CustomEvent('drawdio-contextmenu', {
      detail: {
        x: e.clientX,
        y: e.clientY,
        hasSelection: appState.selectedIds.length > 0,
        worldX: ptWorld.x,
        worldY: ptWorld.y,
      },
    }));
  }

  svgEl.addEventListener('mousedown', onMouseDown);
  svgEl.addEventListener('dblclick', onDoubleClick);
  svgEl.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  containerEl.addEventListener('wheel', onWheel, { passive: false });

  // Cleanup
  return () => {
    svgEl.removeEventListener('mousedown', onMouseDown);
    svgEl.removeEventListener('dblclick', onDoubleClick);
    svgEl.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    containerEl.removeEventListener('wheel', onWheel);
  };
}
