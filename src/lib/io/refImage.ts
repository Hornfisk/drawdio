import { appState } from '../state/app.svelte.js';
import { createComponent } from '../state/actions.js';
import { select } from '../state/selection.js';
import { pushHistory } from '../state/history.js';

// Apply a data URL as the reference image, optionally resizing the canvas to
// match the image's natural dimensions. If the canvas has existing components,
// the user is prompted before the canvas is resized.
export function setRefImageFromDataUrl(dataUrl: string): void {
  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const hasContent = appState.components.length > 0;
    const shouldResize = hasContent
      ? confirm(`Resize canvas to ${w}×${h}px?`)
      : true;
    if (shouldResize) {
      appState.canvasWidth = w;
      appState.canvasHeight = h;
    }
    appState.refImageDataUrl = dataUrl;
    appState.refImageVisible = true;
    appState.refImageOpacity = appState.refImageOpacity ?? 0.5;
    appState.isDirty = true;
  };
  img.src = dataUrl;
}

// Open a file picker and apply the selected image as the reference image.
export function pickRefImageFromFile(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/gif';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRefImageFromDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };
  input.click();
}

// Place a data URL as an image_placeholder component at the canvas center.
export function pasteImageAsComponent(dataUrl: string, name = 'Pasted Image'): void {
  const img = new Image();
  img.onload = () => {
    const maxSide = 400;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxSide || h > maxSide) {
      const s = maxSide / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const cx = appState.canvasWidth / 2 - w / 2;
    const cy = appState.canvasHeight / 2 - h / 2;
    pushHistory();
    const comp = createComponent('image_placeholder', cx, cy);
    if (comp) {
      comp.width = w;
      comp.height = h;
      comp.properties.imageDataUrl = dataUrl;
      comp.properties.imageName = name;
      comp.label = name;
      select(comp.id);
      appState.isDirty = true;
    }
  };
  img.src = dataUrl;
}
