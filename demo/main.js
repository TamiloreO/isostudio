import { createScene, setTile, getTile, addProp, removePropAt } from "../src/scene.js";
import { worldToScreen, screenToWorld, TILE_W, TILE_H } from "../src/projection.js";
import { orderProps } from "../src/depth.js";
import { faceFactors, shade } from "../src/lighting.js";
import { report } from "../src/validate.js";
import { toTiledMap, toManifest } from "../src/export/tiled.js";

const TILES = {
  1: {
    name: "grass",
    colors: { top: "#4f9d5d", left: "#3a7d44", right: "#43894c" },
    edges: { n: "#4f9d5d", e: "#4f9d5d", s: "#4f9d5d", w: "#4f9d5d" },
  },
  2: {
    name: "stone",
    colors: { top: "#9a9a96", left: "#74746f", right: "#84847f" },
    edges: { n: "#9a9a96", e: "#9a9a96", s: "#9a9a96", w: "#9a9a96" },
  },
  3: {
    name: "water",
    colors: { top: "#4b86b4", left: "#35638a", right: "#3f74a0" },
    edges: { n: "#4b86b4", e: "#4b86b4", s: "#4b86b4", w: "#4b86b4" },
  },
};

const PROPS = {
  crate: { name: "crate", w: 1, d: 1, h: 1, colors: { top: "#c98f4a", left: "#8a5a2b", right: "#a9713a" } },
  wall: { name: "wall", w: 3, d: 1, h: 2, colors: { top: "#b0b0aa", left: "#77776f", right: "#8f8f88" } },
  tree: { name: "tree", w: 1, d: 1, h: 3, colors: { top: "#5fae63", left: "#2f6b38", right: "#3f8447" } },
};

const palette = [
  ...new Set([
    ...Object.values(TILES).flatMap((t) => Object.values(t.colors)),
    ...Object.values(PROPS).flatMap((p) => Object.values(p.colors)),
  ]),
];

const scene = createScene({ width: 12, height: 12, palette, lightAngle: 45 });
for (let y = 0; y < scene.height; y += 1) {
  for (let x = 0; x < scene.width; x += 1) setTile(scene, x, y, 1);
}
addProp(scene, { ...PROPS.wall, x: 2, y: 2 });
addProp(scene, { ...PROPS.crate, x: 7, y: 4 });
addProp(scene, { ...PROPS.crate, x: 7, y: 4, z: 1 });
addProp(scene, { ...PROPS.tree, x: 9, y: 7 });
addProp(scene, { ...PROPS.crate, x: 4, y: 8 });

const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
const zoom = 1.8;
const origin = { x: canvas.width / 2, y: 70 };

let mode = { kind: "tile", id: 2 };
let hover = null;

const atlasMeta = {
  image: "atlas.png",
  columns: Object.keys(TILES).length,
  width: Object.keys(TILES).length * TILE_W,
  height: TILE_H,
  count: Object.keys(TILES).length,
};

function project(x, y, z = 0) {
  const p = worldToScreen(x, y, z, { tileW: TILE_W, tileH: TILE_H });
  return { x: p.x, y: p.y };
}

function poly(points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawGround() {
  // One path per tile type: neighbouring diamonds then share an edge instead
  // of leaving an antialiased hairline between two separate fills.
  const byType = new Map();
  for (let y = 0; y < scene.height; y += 1) {
    for (let x = 0; x < scene.width; x += 1) {
      const id = getTile(scene, x, y);
      if (!id) continue;
      if (!byType.has(id)) byType.set(id, []);
      byType.get(id).push({ x, y });
    }
  }

  for (const [id, cells] of byType) {
    ctx.beginPath();
    for (const { x, y } of cells) {
      const p = [project(x, y), project(x + 1, y), project(x + 1, y + 1), project(x, y + 1)];
      ctx.moveTo(p[0].x, p[0].y);
      ctx.lineTo(p[1].x, p[1].y);
      ctx.lineTo(p[2].x, p[2].y);
      ctx.lineTo(p[3].x, p[3].y);
      ctx.closePath();
    }
    ctx.fillStyle = TILES[id].colors.top;
    ctx.fill();
  }

  // Only the outer edge of the ground gets a slab face, otherwise every tile
  // draws its own side and the floor turns into stripes.
  const drop = 6;
  const faces = new Map();
  const addFace = (color, quad) => {
    if (!faces.has(color)) faces.set(color, []);
    faces.get(color).push(quad);
  };

  for (let y = 0; y < scene.height; y += 1) {
    for (let x = 0; x < scene.width; x += 1) {
      const id = getTile(scene, x, y);
      if (!id) continue;
      const def = TILES[id];
      if (!getTile(scene, x, y + 1)) {
        const a = project(x, y + 1);
        const b = project(x + 1, y + 1);
        addFace(def.colors.left, [a, b, { x: b.x, y: b.y + drop }, { x: a.x, y: a.y + drop }]);
      }
      if (!getTile(scene, x + 1, y)) {
        const a = project(x + 1, y);
        const b = project(x + 1, y + 1);
        addFace(def.colors.right, [a, b, { x: b.x, y: b.y + drop }, { x: a.x, y: a.y + drop }]);
      }
    }
  }

  for (const [color, quads] of faces) {
    ctx.beginPath();
    for (const q of quads) {
      ctx.moveTo(q[0].x, q[0].y);
      ctx.lineTo(q[1].x, q[1].y);
      ctx.lineTo(q[2].x, q[2].y);
      ctx.lineTo(q[3].x, q[3].y);
      ctx.closePath();
    }
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function drawProp(p, factors) {
  const z = p.z ?? 0;
  const x0 = p.x;
  const y0 = p.y;
  const x1 = p.x + p.w;
  const y1 = p.y + p.d;
  const top = z + p.h;

  // The two vertical faces first, then the top, so the box reads correctly.
  poly(
    [project(x0, y1, top), project(x1, y1, top), project(x1, y1, z), project(x0, y1, z)],
    shade(p.colors.left, factors.left),
  );
  poly(
    [project(x1, y0, top), project(x1, y1, top), project(x1, y1, z), project(x1, y0, z)],
    shade(p.colors.right, factors.right),
  );
  poly(
    [project(x0, y0, top), project(x1, y0, top), project(x1, y1, top), project(x0, y1, top)],
    shade(p.colors.top, factors.top),
  );
}

function drawHover() {
  if (!hover) return;
  const { x, y } = hover;
  const points = [project(x, y), project(x + 1, y), project(x + 1, y + 1), project(x, y + 1)];
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.strokeStyle = "#b3341f";
  ctx.lineWidth = 1 / zoom;
  ctx.stroke();
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(zoom, 0, 0, zoom, origin.x, origin.y);
  ctx.imageSmoothingEnabled = false;

  const factors = faceFactors(scene.lightAngle);
  drawGround();
  for (const p of orderProps(scene.props)) drawProp(p, factors);
  drawHover();
}

function renderWarnings() {
  const list = document.getElementById("warnings");
  const result = report(scene, TILES);
  list.innerHTML = "";

  if (result.ok) {
    const li = document.createElement("li");
    li.className = "clean";
    li.textContent = "No seams, no off-palette colours.";
    list.appendChild(li);
    return;
  }

  for (const seam of result.seams.slice(0, 5)) {
    const li = document.createElement("li");
    li.textContent = `seam ${seam.side} of (${seam.x},${seam.y}): wants ${seam.expected}, meets ${seam.found}`;
    list.appendChild(li);
  }
  if (result.seams.length > 5) {
    const li = document.createElement("li");
    const rest = result.seams.length - 5;
    li.textContent = `and ${rest} more ${rest === 1 ? "seam" : "seams"}`;
    list.appendChild(li);
  }
  for (const drift of result.offPalette.slice(0, 3)) {
    const li = document.createElement("li");
    li.textContent = `${drift.color} is ${Math.round(drift.distance)} from ${drift.nearest}`;
    list.appendChild(li);
  }
}

function refresh() {
  draw();
  renderWarnings();
}

function tileAt(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const px = (event.clientX - rect.left) * scale;
  const py = (event.clientY - rect.top) * scale;
  const local = { x: (px - origin.x) / zoom, y: (py - origin.y) / zoom };
  const world = screenToWorld(local.x, local.y, { tileW: TILE_W, tileH: TILE_H });
  return { x: Math.floor(world.x), y: Math.floor(world.y) };
}

canvas.addEventListener("mousemove", (event) => {
  const t = tileAt(event);
  hover = t.x >= 0 && t.y >= 0 && t.x < scene.width && t.y < scene.height ? t : null;
  draw();
});

canvas.addEventListener("mouseleave", () => {
  hover = null;
  draw();
});

canvas.addEventListener("click", (event) => {
  const t = tileAt(event);
  if (t.x < 0 || t.y < 0 || t.x >= scene.width || t.y >= scene.height) return;

  if (event.shiftKey) {
    removePropAt(scene, t.x, t.y);
  } else if (mode.kind === "tile") {
    setTile(scene, t.x, t.y, mode.id);
  } else {
    addProp(scene, { ...PROPS[mode.id], x: t.x, y: t.y });
  }
  refresh();
});

function brushButton(label, pressed, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.setAttribute("aria-pressed", String(pressed));
  b.addEventListener("click", onClick);
  return b;
}

function buildBrushes() {
  const ground = document.getElementById("ground-brushes");
  for (const [id, def] of Object.entries(TILES)) {
    ground.appendChild(
      brushButton(def.name, mode.kind === "tile" && mode.id === Number(id), () => {
        mode = { kind: "tile", id: Number(id) };
        buildBrushes();
      }),
    );
  }

  const props = document.getElementById("prop-brushes");
  for (const [key, def] of Object.entries(PROPS)) {
    props.appendChild(
      brushButton(def.name, mode.kind === "prop" && mode.id === key, () => {
        mode = { kind: "prop", id: key };
        buildBrushes();
      }),
    );
  }
  props.appendChild(
    brushButton("erase", false, () => {
      mode = { kind: "erase" };
      buildBrushes();
    }),
  );
}

function download(name, data, type = "application/json") {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById("light").addEventListener("input", (event) => {
  scene.lightAngle = Number(event.target.value);
  document.getElementById("light-value").textContent = `${scene.lightAngle}°`;
  draw();
});

document.getElementById("export-map").addEventListener("click", () => {
  download("scene.tmj", JSON.stringify(toTiledMap(scene, atlasMeta), null, 2));
});

document.getElementById("export-manifest").addEventListener("click", () => {
  download("manifest.json", JSON.stringify(toManifest(scene, atlasMeta), null, 2));
});

document.getElementById("export-preview").addEventListener("click", () => {
  canvas.toBlob((blob) => download("preview.png", blob, "image/png"));
});

document.getElementById("export-atlas").addEventListener("click", () => {
  const off = document.createElement("canvas");
  off.width = atlasMeta.width;
  off.height = atlasMeta.height;
  const octx = off.getContext("2d");
  Object.values(TILES).forEach((def, index) => {
    const cx = index * TILE_W + TILE_W / 2;
    const cy = TILE_H / 2;
    octx.beginPath();
    octx.moveTo(cx, cy - TILE_H / 2);
    octx.lineTo(cx + TILE_W / 2, cy);
    octx.lineTo(cx, cy + TILE_H / 2);
    octx.lineTo(cx - TILE_W / 2, cy);
    octx.closePath();
    octx.fillStyle = def.colors.top;
    octx.fill();
  });
  off.toBlob((blob) => download("atlas.png", blob, "image/png"));
});

buildBrushes();
document.getElementById("light-value").textContent = `${scene.lightAngle}°`;
refresh();
