import test from "node:test";
import assert from "node:assert/strict";

import { worldToScreen, screenToWorld, tileDiamond } from "../src/projection.js";
import { faceFactors, shade, hexToRgb } from "../src/lighting.js";
import { parsePalette, nearest, drift } from "../src/palette.js";

test("projection round trips through screen space", () => {
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [4, 7], [-3, 2]]) {
    const s = worldToScreen(x, y);
    const back = screenToWorld(s.x, s.y);
    assert.ok(Math.abs(back.x - x) < 1e-9, `x ${x} -> ${back.x}`);
    assert.ok(Math.abs(back.y - y) < 1e-9, `y ${y} -> ${back.y}`);
  }
});

test("height lifts a point straight up by one tile height", () => {
  const ground = worldToScreen(2, 3, 0);
  const raised = worldToScreen(2, 3, 1);
  assert.equal(raised.x, ground.x);
  assert.equal(raised.y, ground.y - 16);
});

test("a tile is a diamond twice as wide as it is tall", () => {
  const [a, b, c, d] = tileDiamond(0, 0);
  assert.deepEqual(a, { x: 0, y: 0 });
  assert.deepEqual(b, { x: 16, y: 8 });
  assert.deepEqual(c, { x: 0, y: 16 });
  assert.deepEqual(d, { x: -16, y: 8 });
});

test("the light angle decides which vertical face is brighter", () => {
  const fromRight = faceFactors(0);
  assert.ok(fromRight.right > fromRight.left, "right face should lead at 0 degrees");

  const fromLeft = faceFactors(90);
  assert.ok(fromLeft.left > fromLeft.right, "left face should lead at 90 degrees");

  for (const angle of [0, 45, 90, 135, 180, 270]) {
    const f = faceFactors(angle);
    assert.ok(f.top >= f.left && f.top >= f.right, `top should be brightest at ${angle}`);
  }
});

test("shading at 1 leaves the colour alone and shading darkens it", () => {
  assert.equal(shade("#3a7d44", 1), "#3a7d44");
  const darker = hexToRgb(shade("#ffffff", 0.5));
  assert.deepEqual(darker, { r: 128, g: 128, b: 128 });
});

test("palette parsing accepts hashes, bare hex and separators", () => {
  const p = parsePalette("#3a7d44, 1a1c2c; f4f4f4");
  assert.deepEqual(p, ["#3a7d44", "#1a1c2c", "#f4f4f4"]);
});

test("nearest finds the closest entry and reports the gap", () => {
  const p = ["#000000", "#ffffff"];
  const n = nearest("#050505", p);
  assert.equal(n.color, "#000000");
  assert.ok(n.distance < 20);
});

test("drift only flags colours outside the tolerance", () => {
  const p = ["#3a7d44", "#1a1c2c"];
  const bad = drift(["#3a7d44", "#ff00ff"], p, 24);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].color, "#ff00ff");
});
