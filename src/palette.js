import { hexToRgb, rgbToHex } from "./lighting.js";

export function parsePalette(text) {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("#") ? s.toLowerCase() : `#${s.toLowerCase()}`))
    .filter((s) => /^#[0-9a-f]{6}$/.test(s) || /^#[0-9a-f]{3}$/.test(s))
    .map((s) => {
      const { r, g, b } = hexToRgb(s);
      return rgbToHex({ r, g, b });
    });
}

export function distance(a, b) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
}

export function nearest(color, palette) {
  let best = null;
  let bestD = Infinity;
  for (const p of palette) {
    const d = distance(color, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { color: best, distance: bestD };
}

// Anything further than the tolerance from every palette entry is drift:
// a shade that crept in from a filter or a copy-paste from another image.
export function drift(colors, palette, tolerance = 24) {
  const out = [];
  for (const c of colors) {
    const n = nearest(c, palette);
    if (n.distance > tolerance) out.push({ color: c, nearest: n.color, distance: n.distance });
  }
  return out;
}
