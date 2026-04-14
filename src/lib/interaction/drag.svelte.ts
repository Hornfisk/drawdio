import { appState } from '../state/app.svelte.js';
import { select, addToSelection, clearSelection, isSelected, removeFromSelection } from '../state/selection.js';
import { createComponent, getComponentAtPoint } from '../state/actions.js';
import { screenToCanvas, snap } from '../utils/geometry.js';
import { pushHistory } from '../state/history.js';
import { expandSelection } from '../state/groups.js';
import { duplicateInPlace } from '../state/clipboard.js';

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

export function getRubberBand() { return rubberBand; }
export function getActiveRotation() { return activeRotation; }

function normalizeAngle(a: number): number {
  return ((a % 360) + 360) % 360;
}

export function initDrag(svgEl: SVGSVGElement, containerEl: HTMLElement): () => void {
  function onMouseDown(e: MouseEvent) {
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

    const pt = screenToCanvas(svgEl, e.clientX, e.clientY);

    // Check rotation handle (must come before resize handle check)
    const rotHandleEl = (e.target as Element).closest?.('[data-rotate-handle]');
    if (rotHandleEl) {
      const selFor = (rotHandleEl as Element).closest('[data-selection-for]');
      if (selFor) {
        const compId = selFor.getAttribute('data-selection-for')!;
        const comp = appState.components.find(c => c.id === compId);
        if (comp) {
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
        const comp = appState.components.find(c => c.id === compId);
        if (comp) {
          state = 'resizing';
          pushHistory();
          resizeHandle = handleEl.getAttribute('data-handle');
          resizeStartBounds = { x: comp.x, y: comp.y, w: comp.width, h: comp.height };
          resizeStartAspect = comp.height > 0 ? comp.width / comp.height : 1;
          startX = pt.x;
          startY = pt.y;
          movingIds = [compId];
          hasMoved = false;
          e.preventDefault();
          return;
        }
      }
    }

    // Placement mode
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

    // Check component under cursor
    const clicked = getComponentAtPoint(pt.x, pt.y);
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
        .filter(c => c != null)
        .map(c => ({ id: c.id, x: c.x, y: c.y }));
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

    const pt = screenToCanvas(svgEl, e.clientX, e.clientY);

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
              if (Math.abs(d) < Math.abs(bestDx) && Math.abs(d) <= threshold) bestDx = d;
            }
          }
          for (const ry of refYs) {
            for (const cy of yCandidates) {
              const d = cy - ry;
              if (Math.abs(d) < Math.abs(bestDy) && Math.abs(d) <= threshold) bestDy = d;
            }
          }
          if (bestDx !== Infinity) alignDx = bestDx;
          if (bestDy !== Infinity) alignDy = bestDy;
        }
      }

      for (const start of movingStarts) {
        const comp = appState.components.find(c => c.id === start.id);
        if (!comp) continue;
        if (altHeld) {
          comp.x = start.x + dx;
          comp.y = start.y + dy;
        } else {
          const gridSnapped = snap(start.x + dx, start.y + dy);
          comp.x = alignDx !== null ? start.x + dx + alignDx : gridSnapped.x;
          comp.y = alignDy !== null ? start.y + dy + alignDy : gridSnapped.y;
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

      if (resizeHandle.includes('r')) { newW = Math.max(10, b.w + rdx); }
      if (resizeHandle.includes('l')) { newW = Math.max(10, b.w - rdx); newX = b.x + b.w - newW; }
      if (resizeHandle.includes('b')) { newH = Math.max(10, b.h + rdy); }
      if (resizeHandle.includes('t')) { newH = Math.max(10, b.h - rdy); newY = b.y + b.h - newH; }

      // Shift: constrain aspect ratio on corner handles
      const isCorner = (resizeHandle.includes('t') || resizeHandle.includes('b'))
                    && (resizeHandle.includes('l') || resizeHandle.includes('r'));
      if (e.shiftKey && isCorner) {
        if (Math.abs(newW - b.w) >= Math.abs(newH - b.h)) {
          newH = Math.max(10, newW / resizeStartAspect);
          if (resizeHandle.includes('t')) newY = b.y + b.h - newH;
        } else {
          newW = Math.max(10, newH * resizeStartAspect);
          if (resizeHandle.includes('l')) newX = b.x + b.w - newW;
        }
      }

      // Snap only the moving edges — snapping the anchored edge would shift the whole item.
      // Alt disables snapping for pixel-perfect resize.
      if (appState.snapEnabled && !altHeld) {
        const g = appState.gridSize;
        if (resizeHandle.includes('l')) {
          const sx = Math.round(newX / g) * g;
          newW = Math.max(10, newW + (newX - sx));
          newX = sx;
        } else if (resizeHandle.includes('r')) {
          const right = newX + newW;
          newW = Math.max(10, Math.round(right / g) * g - newX);
        }
        if (resizeHandle.includes('t')) {
          const sy = Math.round(newY / g) * g;
          newH = Math.max(10, newH + (newY - sy));
          newY = sy;
        } else if (resizeHandle.includes('b')) {
          const bottom = newY + newH;
          newH = Math.max(10, Math.round(bottom / g) * g - newY);
        }
      }
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
    rubberBand = null;
    rotatingId = null;
    activeRotation = null;
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
    const pt = screenToCanvas(svgEl, e.clientX, e.clientY);
    const comp = getComponentAtPoint(pt.x, pt.y);
    if (comp && !isSelected(comp.id)) {
      select(comp.id);
    }
    window.dispatchEvent(new CustomEvent('drawdio-contextmenu', {
      detail: { x: e.clientX, y: e.clientY, hasSelection: appState.selectedIds.length > 0 }
    }));
  }

  svgEl.addEventListener('mousedown', onMouseDown);
  svgEl.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  containerEl.addEventListener('wheel', onWheel, { passive: false });

  // Cleanup
  return () => {
    svgEl.removeEventListener('mousedown', onMouseDown);
    svgEl.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    containerEl.removeEventListener('wheel', onWheel);
  };
}
