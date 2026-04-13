import { appState } from '../state/app.svelte.js';

export function snap(x: number, y: number): { x: number; y: number } {
  if (!appState.snapEnabled) return { x, y };
  const g = appState.gridSize;
  return {
    x: Math.round(x / g) * g,
    y: Math.round(y / g) * g,
  };
}

export function screenToCanvas(svgEl: SVGSVGElement, screenX: number, screenY: number): { x: number; y: number } {
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: screenX, y: screenY };
  const inv = ctm.inverse();
  return {
    x: inv.a * screenX + inv.c * screenY + inv.e,
    y: inv.b * screenX + inv.d * screenY + inv.f,
  };
}
