// One light for the whole scene: every prop's three visible faces are shaded
// from the same angle, so nothing looks pasted in from another drawing.

const DEG = Math.PI / 180;

export function faceFactors(angleDeg, ambient = 0.62, diffuse = 0.38) {
  const a = angleDeg * DEG;
  // Ground direction the light comes from.
  const lx = Math.cos(a);
  const ly = Math.sin(a);

  // The two visible vertical faces point along +x (right) and +y (left).
  const rightLit = Math.max(0, lx);
  const leftLit = Math.max(0, ly);

  return {
    top: clamp(ambient + diffuse * 1.0),
    left: clamp(ambient + diffuse * (0.35 + 0.65 * leftLit)),
    right: clamp(ambient + diffuse * (0.35 + 0.65 * rightLit)),
  };
}

function clamp(v) {
  return Math.max(0, Math.min(1.6, v));
}

export function hexToRgb(hex) {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const part = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function shade(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r * factor, g: g * factor, b: b * factor });
}
