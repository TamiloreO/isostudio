import test from "node:test";
import assert from "node:assert/strict";

import { orderProps, violatesOrder } from "../src/depth.js";

const prop = (over) => ({ name: "p", z: 0, w: 1, d: 1, h: 1, ...over });

test("a row along x is drawn back to front", () => {
  const props = [prop({ id: 3, x: 2, y: 0 }), prop({ id: 1, x: 0, y: 0 }), prop({ id: 2, x: 1, y: 0 })];
  const order = orderProps(props);
  assert.deepEqual(order.map((p) => p.id), [1, 2, 3]);
  assert.equal(violatesOrder(order), null);
});

test("a row along y is drawn back to front", () => {
  const props = [prop({ id: 1, x: 0, y: 0 }), prop({ id: 2, x: 0, y: 1 }), prop({ id: 3, x: 0, y: 2 })];
  const order = orderProps(props);
  assert.deepEqual(order.map((p) => p.id), [1, 2, 3]);
});

test("a stacked crate is drawn after the crate under it", () => {
  const base = prop({ id: 1, x: 2, y: 2, z: 0, h: 1 });
  const top = prop({ id: 2, x: 2, y: 2, z: 1, h: 1 });
  const order = orderProps([top, base]);
  assert.deepEqual(order.map((p) => p.id), [1, 2]);
});

test("a tall tree behind a crate still goes first", () => {
  const tree = prop({ id: 1, x: 5, y: 5, h: 3 });
  const crate = prop({ id: 2, x: 6, y: 5, h: 1 });
  const order = orderProps([crate, tree]);
  assert.deepEqual(order.map((p) => p.id), [1, 2]);
});

test("a wide wall never lands in front of what it blocks", () => {
  const wall = prop({ id: 1, x: 0, y: 4, w: 4, d: 1, h: 2 });
  const crate = prop({ id: 2, x: 1, y: 3, h: 1 });
  const order = orderProps([crate, wall]);
  assert.equal(violatesOrder(order), null, JSON.stringify(order.map((p) => p.id)));
  const crateIndex = order.findIndex((p) => p.id === 2);
  const wallIndex = order.findIndex((p) => p.id === 1);
  assert.ok(crateIndex < wallIndex, "crate at y=3 is behind the wall at y=4");
});

test("ordering is deterministic for identical keys", () => {
  const props = [prop({ id: 2, x: 1, y: 1 }), prop({ id: 1, x: 1, y: 1 })];
  const a = orderProps(props).map((p) => p.id);
  const b = orderProps([...props].reverse()).map((p) => p.id);
  assert.deepEqual(a, b);
});
