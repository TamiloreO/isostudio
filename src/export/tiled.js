import { worldToScreen } from "../projection.js";

// Emits a Tiled isometric map. The point is that the exported file opens in a
// real editor and matches the preview, so the tool's output can be checked
// without trusting the tool.
export function toTiledMap(scene, atlas) {
  const { tileW, tileH } = scene;

  const data = scene.tiles.map((id) => (id ? id : 0));

  const objects = scene.props.map((p) => {
    const anchor = worldToScreen(p.x, p.y, 0, { tileW, tileH });
    return {
      id: p.id,
      name: p.name,
      type: "prop",
      x: round(anchor.x),
      y: round(anchor.y),
      width: round(p.w * (tileW / 2) + p.d * (tileW / 2)),
      height: round((p.w + p.d) * (tileH / 2) + p.h * tileH),
      properties: [
        { name: "gridX", type: "int", value: p.x },
        { name: "gridY", type: "int", value: p.y },
        { name: "gridZ", type: "int", value: p.z ?? 0 },
        { name: "footprintW", type: "int", value: p.w },
        { name: "footprintD", type: "int", value: p.d },
        { name: "height", type: "int", value: p.h },
        { name: "solid", type: "bool", value: true },
      ],
    };
  });

  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.0",
    orientation: "isometric",
    renderorder: "right-down",
    infinite: false,
    width: scene.width,
    height: scene.height,
    tilewidth: tileW,
    tileheight: tileH,
    nextlayerid: 3,
    nextobjectid: scene.nextPropId,
    layers: [
      {
        id: 1,
        type: "tilelayer",
        name: "ground",
        width: scene.width,
        height: scene.height,
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        data,
      },
      {
        id: 2,
        type: "objectgroup",
        name: "props",
        draworder: "topdown",
        opacity: 1,
        visible: true,
        objects,
      },
    ],
    tilesets: [
      {
        firstgid: 1,
        name: "tiles",
        image: atlas.image,
        imagewidth: atlas.width,
        imageheight: atlas.height,
        tilewidth: tileW,
        tileheight: tileH,
        tilecount: atlas.count,
        columns: atlas.columns,
        margin: 0,
        spacing: 0,
      },
    ],
  };
}

export function toManifest(scene, atlas) {
  return {
    format: "isostudio/1",
    width: scene.width,
    height: scene.height,
    tileWidth: scene.tileW,
    tileHeight: scene.tileH,
    lightAngle: scene.lightAngle,
    palette: scene.palette,
    atlas,
    ground: scene.tiles,
    props: scene.props.map((p) => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      z: p.z ?? 0,
      w: p.w,
      d: p.d,
      h: p.h,
      colors: p.colors,
    })),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}
