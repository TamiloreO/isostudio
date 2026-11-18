// 2:1 isometric projection. Grid coordinates in, screen pixels out.
// x runs down-right, y runs down-left, z is height in tile heights.

export const TILE_W = 32;
export const TILE_H = 16;

export function worldToScreen(x, y, z = 0, opts = {}) {
  const tw = opts.tileW ?? TILE_W;
  const th = opts.tileH ?? TILE_H;
  return {
    x: (x - y) * (tw / 2),
    y: (x + y) * (th / 2) - z * th,
  };
}

export function screenToWorld(sx, sy, opts = {}) {
  const tw = opts.tileW ?? TILE_W;
  const th = opts.tileH ?? TILE_H;
  return {
    x: (sx / (tw / 2) + sy / (th / 2)) / 2,
    y: (sy / (th / 2) - sx / (tw / 2)) / 2,
  };
}

// The four corners of a ground tile, for hit testing and drawing.
export function tileDiamond(x, y, opts = {}) {
  return [
    worldToScreen(x, y, 0, opts),
    worldToScreen(x + 1, y, 0, opts),
    worldToScreen(x + 1, y + 1, 0, opts),
    worldToScreen(x, y + 1, 0, opts),
  ];
}
