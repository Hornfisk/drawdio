import { snap, screenToCanvas } from './geometry.js';
import { appState } from '../state/app.svelte.js';
import { getActiveWorkspace, switchWorkspace } from '../state/workspaces.js';

/** Workspace rect hit-test in world space (mirrors drag.svelte.ts helper). */
function workspaceAtWorldPoint(px: number, py: number) {
  for (const ws of appState.workspaces) {
    const isActive = ws.id === appState.activeWorkspaceId;
    const w = isActive ? appState.canvasWidth : ws.canvasWidth;
    const h = isActive ? appState.canvasHeight : ws.canvasHeight;
    if (px >= ws.x && px <= ws.x + w && py >= ws.y && py <= ws.y + h) return ws;
  }
  return null;
}

const DRAG_THRESHOLD = 4;

interface DragHandlerOptions {
  /** Text shown in the drag ghost label */
  label: string;
  /**
   * Called with canvas-space coordinates when the item is dropped on the canvas.
   * May be async.
   */
  onDrop: (canvasX: number, canvasY: number) => void | Promise<void>;
  /**
   * Called when mouse is released without dragging (click-to-place).
   * If omitted, a click does nothing.
   */
  onClick?: () => void | Promise<void>;
}

/**
 * Returns a mousedown handler that implements the drag-to-canvas pattern:
 * shows a ghost label while dragging, converts screen coords to canvas coords
 * via SVG CTM on drop, snaps to grid, calls onDrop or onClick.
 */
export function createDragHandler(opts: DragHandlerOptions): (e: MouseEvent) => void {
  return function onMouseDown(e: MouseEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    let ghost: HTMLDivElement | null = null;

    function onMouseMove(me: MouseEvent) {
      const dist = Math.abs(me.clientX - startX) + Math.abs(me.clientY - startY);
      if (dist > DRAG_THRESHOLD && !ghost) {
        ghost = document.createElement('div');
        ghost.className = 'palette-drag-ghost';
        ghost.textContent = opts.label;
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = me.clientX + 12 + 'px';
        ghost.style.top = me.clientY - 12 + 'px';
        document.body.style.cursor = 'grabbing';
      }
    }

    async function onMouseUp(me: MouseEvent) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';

      try {
        if (ghost) {
          ghost.remove();
          ghost = null;

          const container = document.querySelector('.canvas-container');
          const svgEl = container?.querySelector('svg');
          if (container && svgEl) {
            const rect = container.getBoundingClientRect();
            const overCanvas =
              me.clientX >= rect.left && me.clientX <= rect.right &&
              me.clientY >= rect.top  && me.clientY <= rect.bottom;
            if (overCanvas) {
              const worldPos = screenToCanvas(svgEl as SVGSVGElement, me.clientX, me.clientY);
              // Components are stored in their workspace's local coord space. Figure out
              // which workspace's rect was dropped on; if it's a non-active one, switch to it
              // first so createComponent() appends into the right workspace's components.
              const dropTarget = workspaceAtWorldPoint(worldPos.x, worldPos.y) ?? getActiveWorkspace();
              if (dropTarget && dropTarget.id !== appState.activeWorkspaceId) {
                switchWorkspace(dropTarget.id);
              }
              const active = getActiveWorkspace();
              const offX = active?.x ?? 0;
              const offY = active?.y ?? 0;
              const localX = worldPos.x - offX;
              const localY = worldPos.y - offY;
              const snapped = snap(localX, localY);
              await opts.onDrop(snapped.x, snapped.y);
            }
          }
        } else if (opts.onClick) {
          await opts.onClick();
        }
      } catch (err) {
        console.error('drag-to-canvas: drop/click handler failed:', err);
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
}
