import { getTile } from "./scene.js";
import { drift } from "./palette.js";

// A tile carries the colour it presents on each of its four edges. Two tiles
// that meet must agree on the edge they share, otherwise the seam shows as a
// line when the map is drawn.
export function findSeams(scene, tileDefs) {
  const issues = [];
  const def = (id) => tileDefs[id] ?? null;

  for (let y = 0; y < scene.height; y += 1) {
    for (let x = 0; x < scene.width; x += 1) {
      const id = getTile(scene, x, y);
      if (!id) continue;
      const here = def(id);
      if (!here || !here.edges) continue;

      if (x + 1 < scene.width) {
        const eastId = getTile(scene, x + 1, y);
        const east = eastId ? def(eastId) : null;
        if (east && east.edges && here.edges.e !== east.edges.w) {
          issues.push({
            kind: "seam",
            x,
            y,
            side: "east",
            expected: here.edges.e,
            found: east.edges.w,
          });
        }
      }

      if (y + 1 < scene.height) {
        const southId = getTile(scene, x, y + 1);
        const south = southId ? def(southId) : null;
        if (south && south.edges && here.edges.s !== south.edges.n) {
          issues.push({
            kind: "seam",
            x,
            y,
            side: "south",
            expected: here.edges.s,
            found: south.edges.n,
          });
        }
      }
    }
  }

  return issues;
}

export function findPaletteDrift(scene, tileDefs, tolerance = 24) {
  if (!scene.palette.length) return [];
  const used = new Set();
  for (const id of scene.tiles) {
    if (!id) continue;
    const d = tileDefs[id];
    if (!d || !d.colors) continue;
    for (const c of Object.values(d.colors)) used.add(c);
  }
  for (const p of scene.props) {
    for (const c of Object.values(p.colors ?? {})) used.add(c);
  }
  return drift([...used], scene.palette, tolerance);
}

export function report(scene, tileDefs) {
  const seams = findSeams(scene, tileDefs);
  const offPalette = findPaletteDrift(scene, tileDefs);
  return {
    ok: seams.length === 0 && offPalette.length === 0,
    seams,
    offPalette,
  };
}
