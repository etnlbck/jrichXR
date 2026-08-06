# Models

Drop two glTF binary files here:

- `finished.glb` — photogrammetry scan of the polished piece (Polycam / Luma).
- `raw.glb` — scan of the raw, guide-marked stone (or the finished mesh re-textured with raw-state photos for a faster POC).

## Requirements

- **Shared local space:** both meshes must export with the **same origin, up-axis, and scale**. The morph cross-fades two co-located meshes; if they don't register, the effect breaks. Align them in Blender before export.
- **Budget:** < ~100k triangles, < ~10 MB each. Apply Draco or meshopt compression.
- **Lighting:** bake lighting into the texture where possible; the scene adds only simple fill light.

## Obsidian capture warning

Polished black obsidian is near worst-case for photogrammetry (specular, reflective, low-texture). Capture with cross-polarized lighting or a temporary matting spray, or the reconstruction will be full of holes. Validate mesh quality **before** wiring it into the app — this is the single biggest technical risk in the POC.
