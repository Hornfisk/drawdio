// Deterministic namespace → color. Hashes the namespace string to a stable hue
// so any plugin's namespaces render as distinct, consistent tints — no plugin
// name is baked into drawdio. Saturation/lightness are fixed for a cohesive
// palette against the dark canvas.

function hashString(s: string): number {
  let h = 2166136261; // FNV-1a 32-bit
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function nsColor(ns: string): string {
  const hue = hashString(ns) % 360;
  return hslToHex(hue, 0.45, 0.55);
}
