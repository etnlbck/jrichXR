# Models

Drop two glTF binary files here:

- `finished.glb` — photogrammetry of the polished piece.
- `raw.glb` — raw / guide-marked stone (or re-textured finished mesh).

**Shared local space required.** Then set `usePlaceholderCube: false` in `lib/config.ts`.

Budget: < ~100k tris, < ~10 MB each. Draco is supported (`public/draco/` decoder).

See [ASSETS.md](../../../ASSETS.md).
