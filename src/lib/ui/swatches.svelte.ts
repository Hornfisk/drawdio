// Shared swatch palette used by every ColorField/ColorPicker in the app.
// Persisted in localStorage under 'drawdio_swatches'.

const DEFAULT_SWATCHES = ['#4fc3f7', '#f06292', '#66bb6a', '#ffa726', '#ef5350', '#ffee58', '#ab47bc', '#ffffff'];

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
