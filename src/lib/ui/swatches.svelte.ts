// Shared swatch palette used by every ColorField/ColorPicker in the app.
// Persisted in localStorage under 'drawdio_swatches'.

// Brand-aligned defaults: amber, bone, muted, slate, graphite, meter-green, meter-red, scope-cyan
const DEFAULT_SWATCHES = ['#FFB800', '#F4F1EA', '#8E93A0', '#2A2D33', '#0E0F12', '#66BB6A', '#EF5350', '#4FC3F7'];

function loadSwatches(): string[] {
  try {
    const raw = localStorage.getItem('drawdio_swatches');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === 8) return arr;
    }
  } catch {}
  return [...DEFAULT_SWATCHES];
}

export const swatchState = $state({ list: loadSwatches() });

export function saveSwatchAt(index: number, hex: string) {
  swatchState.list = swatchState.list.map((s, i) => i === index ? hex : s);
  localStorage.setItem('drawdio_swatches', JSON.stringify(swatchState.list));
}

export function resetSwatches() {
  swatchState.list = [...DEFAULT_SWATCHES];
  localStorage.removeItem('drawdio_swatches');
}
