import { snap, screenToCanvas } from './geometry.js';

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
            const canvasPos = screenToCanvas(svgEl as SVGSVGElement, me.clientX, me.clientY);
            const snapped = snap(canvasPos.x, canvasPos.y);
            await opts.onDrop(snapped.x, snapped.y);
          }
        }
      } else if (opts.onClick) {
        await opts.onClick();
      }
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  };
}
