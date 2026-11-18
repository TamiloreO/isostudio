// The document: a ground grid of tile ids, a list of props, one light, one palette.

export function createScene(options = {}) {
  const width = options.width ?? 16;
  const height = options.height ?? 16;
  return {
    width,
    height,
    tileW: options.tileW ?? 32,
    tileH: options.tileH ?? 16,
    lightAngle: options.lightAngle ?? 45,
    palette: options.palette ?? [],
    tiles: new Array(width * height).fill(0),
    props: [],
    nextPropId: 1,
  };
}

export function inBounds(scene, x, y) {
  return x >= 0 && y >= 0 && x < scene.width && y < scene.height;
}

export function setTile(scene, x, y, id) {
  if (!inBounds(scene, x, y)) return false;
  scene.tiles[y * scene.width + x] = id;
  return true;
}

export function getTile(scene, x, y) {
  if (!inBounds(scene, x, y)) return 0;
  return scene.tiles[y * scene.width + x];
}

export function addProp(scene, prop) {
  const entry = {
    id: scene.nextPropId,
    name: prop.name ?? "prop",
    x: prop.x,
    y: prop.y,
    z: prop.z ?? 0,
    w: prop.w ?? 1,
    d: prop.d ?? 1,
    h: prop.h ?? 1,
    colors: prop.colors ?? { top: "#c8c8c8", left: "#8a8a8a", right: "#a0a0a0" },
  };
  scene.nextPropId += 1;
  scene.props.push(entry);
  return entry;
}

export function removePropAt(scene, x, y) {
  const index = scene.props.findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.d);
  if (index === -1) return null;
  return scene.props.splice(index, 1)[0];
}

export function countTiles(scene, id) {
  return scene.tiles.filter((t) => t === id).length;
}
