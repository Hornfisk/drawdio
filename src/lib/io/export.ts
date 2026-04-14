import { appState } from '../state/app.svelte.js';
import { download, toJSON } from './serialization.js';
import { showToast } from '../state/toast.svelte.js';

export function exportPNG(scale = 1, transparent = false) {
  const svgEl = document.querySelector('.canvas-container svg') as SVGSVGElement;
  if (!svgEl) return;
  const w = appState.canvasWidth;
  const h = appState.canvasHeight;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  clone.setAttribute('width', String(w * scale));
  clone.setAttribute('height', String(h * scale));

  // Remove selection layer
  const selLayer = clone.querySelector('#selection-layer');
  if (selLayer) {
    while (selLayer.firstChild) selLayer.removeChild(selLayer.firstChild);
  }

  // If transparent, hide bg and grid
  if (transparent) {
    const rects = clone.querySelectorAll('rect');
    if (rects[0]) rects[0].setAttribute('fill', 'transparent');
    if (rects[1]) rects[1].setAttribute('visibility', 'hidden');
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext('2d')!;
    if (!transparent) {
      ctx.fillStyle = appState.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (blob) {
        const suffix = transparent ? '-transparent' : '';
        download(blob, `drawdio-export${suffix}-${scale}x.png`, 'image/png');
        showToast('Exported as PNG (' + scale + '×)');
      }
    }, 'image/png');
  };
  img.src = url;
}

export function exportSVG() {
  const svgEl = document.querySelector('.canvas-container svg') as SVGSVGElement;
  if (!svgEl) return;
  const w = appState.canvasWidth;
  const h = appState.canvasHeight;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const selLayer = clone.querySelector('#selection-layer');
  if (selLayer) {
    while (selLayer.firstChild) selLayer.removeChild(selLayer.firstChild);
  }

  const serializer = new XMLSerializer();
  const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
  download(svgString, 'drawdio-export.svg', 'image/svg+xml');
  showToast('Exported as SVG');
}

export function copyJSONToClipboard() {
  const json = toJSON();
  const str = JSON.stringify(json, null, 2);
  navigator.clipboard.writeText(str);
  showToast('JSON copied to clipboard');
}
