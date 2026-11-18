# Roadmap

## Next

- **Sprite props.** Import a PNG per prop instead of drawing a box, with anchor and footprint set by hand.
- **Transition tiles.** A tile that declares which neighbours it joins, so grass to stone stops warning and starts resolving. The seam checker already finds the pairs; this makes them fixable.
- **Undo and redo.** Every edit goes through the scene, so this is a command log rather than a rewrite.
- **Project save and load.** `manifest.json` already holds the document; it needs a version field and a file picker.

## Later

- **Ambient occlusion.** Contact shading where props meet the ground and each other, computed from the footprints rather than painted.
- **Godot exporter.** A `TileSet` resource plus a scene, alongside the Tiled map.
- **Animated props.** Frame strips with a per-prop tick, drawn in the same depth pass.
- **Collision preview.** The manifest already carries `solid`; draw the walkable grid.
- **Palette lock.** Refuse a colour that is not in the palette instead of only reporting it.

## Known gaps

- The atlas exporter draws ground tiles only; props are rendered live, not packed.
- Tiled object anchors sit at the back corner of a footprint, which is right for boxes and will need revisiting for sprites.
