import test from "node:test";
import assert from "node:assert/strict";

import { createScene, setTile, addProp, getTile } from "../src/scene.js";
import { toTiledMap, toManifest } from "../src/export/tiled.js";
import { findSeams, findPaletteDrift, report } from "../src/validate.js";

const atlas = { image: "atlas.png", width: 128, height: 32, count: 8, columns: 4 };

const defs = {
  1: { name: "grass", colors: { top: "#3a7d44", left: "#2b5c32", right: "#316b3a" }, edges: { n: "#3a7d44", e: "#3a7d44", s: "#3a7d44", w: "#3a7d44" } },
  2: { name: "stone", colors: { top: "#8d8d8d", left: "#6a6a6a", right: "#7a7a7a" }, edges: { n: "#8d8d8d", e: "#8d8d8d", s: "#8d8d8d", w: "#8d8d8d" } },
};

function sceneWithGround() {
  const scene = createScene({ width: 4, height: 4, palette: ["#3a7d44", "#2b5c32", "#316b3a", "#8d8d8d", "#6a6a6a", "#7a7a7a"] });
  setTile(scene, 0, 0, 1);
  setTile(scene, 1, 0, 1);
  setTile(scene, 0, 1, 2);
  addProp(scene, { name: "crate", x: 1, y: 1, h: 1, colors: { top: "#c8c8c8", left: "#8a8a8a", right: "#a0a0a0" } });
  return scene;
}

test("the tiled map is isometric and keeps the grid size", () => {
  const map = toTiledMap(sceneWithGround(), atlas);
  assert.equal(map.orientation, "isometric");
  assert.equal(map.renderorder, "right-down");
  assert.equal(map.width, 4);
  assert.equal(map.height, 4);
  assert.equal(map.tilewidth, 32);
  assert.equal(map.tileheight, 16);
});

test("layer data covers every cell and carries the right ids", () => {
  const scene = sceneWithGround();
  const map = toTiledMap(scene, atlas);
  const ground = map.layers.find((l) => l.type === "tilelayer");
  assert.equal(ground.data.length, 16);
  assert.equal(ground.data[0], 1);
  assert.equal(ground.data[1], 1);
  assert.equal(ground.data[4], 2);
  assert.equal(ground.data[2], 0);
});

test("props become objects with grid and height properties", () => {
  const map = toTiledMap(sceneWithGround(), atlas);
  const layer = map.layers.find((l) => l.type === "objectgroup");
  assert.equal(layer.objects.length, 1);
  const obj = layer.objects[0];
  const props = Object.fromEntries(obj.properties.map((p) => [p.name, p.value]));
  assert.equal(props.gridX, 1);
  assert.equal(props.gridY, 1);
  assert.equal(props.height, 1);
  assert.equal(obj.name, "crate");
});

test("the map survives a JSON round trip", () => {
  const map = toTiledMap(sceneWithGround(), atlas);
  const back = JSON.parse(JSON.stringify(map));
  assert.deepEqual(back.layers[0].data, map.layers[0].data);
});

test("the manifest records the document, not just the pixels", () => {
  const scene = sceneWithGround();
  const manifest = toManifest(scene, atlas);
  assert.equal(manifest.format, "isostudio/1");
  assert.equal(manifest.lightAngle, 45);
  assert.equal(manifest.props.length, 1);
  assert.equal(manifest.ground.length, 16);
});

test("matching edges raise nothing", () => {
  const scene = createScene({ width: 3, height: 3 });
  setTile(scene, 0, 0, 1);
  setTile(scene, 1, 0, 1);
  assert.deepEqual(findSeams(scene, defs), []);
});

test("a mismatched edge is reported with both colours", () => {
  const scene = createScene({ width: 3, height: 3 });
  setTile(scene, 0, 0, 1);
  setTile(scene, 1, 0, 2);
  const seams = findSeams(scene, defs);
  assert.equal(seams.length, 1);
  assert.equal(seams[0].expected, "#3a7d44");
  assert.equal(seams[0].found, "#8d8d8d");
});

test("an off palette prop colour is caught", () => {
  const scene = createScene({ width: 2, height: 2, palette: ["#3a7d44", "#1a1c2c"] });
  addProp(scene, { name: "odd", x: 0, y: 0, colors: { top: "#ff00ff", left: "#1a1c2c", right: "#1a1c2c" } });
  const bad = findPaletteDrift(scene, defs);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].color, "#ff00ff");
});

test("report combines both checks", () => {
  const scene = createScene({ width: 2, height: 2, palette: ["#3a7d44"] });
  setTile(scene, 0, 0, 1);
  setTile(scene, 1, 0, 2);
  const r = report(scene, defs);
  assert.equal(r.ok, false);
  assert.ok(r.seams.length >= 1);
});
