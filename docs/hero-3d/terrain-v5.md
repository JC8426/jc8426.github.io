# Terrain v5: surface continuity and a bounded resident mesh

This revision targets the regular diagonal bands visible in the v4 screenshots. It does not claim that the terrain is a scanned lunar surface or that a fully photoreal result has already been achieved.

## Changes and reasons

- Replaced the three directional sine-wave texture blending fields with quintic-smoothed, domain-warped value noise. The old fields created regularly intersecting transition bands. All three PBR channels retain aligned UV translations, and the blend weights are computed once per fragment rather than independently per map.
- Normal vectors now come from a fixed 0.35 m central difference of the underlying height field at every vertex, including ring boundaries. They no longer depend on the diagonal orientation of a mesh cell or on unequal adjacent triangle sizes.
- Terrain receives aircraft shadows but does not cast into the small aircraft-focused sun shadow map. This removes a major source of grazing-angle self-shadow acne that can reveal individual triangles. The tradeoff is that dunes do not currently cast long terrain-on-terrain shadows; their shape is still shaded by the sun and environment. A properly budgeted terrain horizon-shadow solution is future work.
- Lowered sand normal strength from 0.46 to 0.24. Small grains should not have the contrast of large rocks. Reduced the warm base tint to avoid double-tinting an already photographed albedo.
- Compacted the middle and distant terrain rings: vertices under their omitted faces are no longer allocated. The detailed central grid changes from 0.5 m to 0.667 m spacing; medium and horizon rings remain at 2 m and 4 m. Continuous surface normals and normal maps carry detail instead of uniform mesh density.

## Asset provenance

The existing local PBR maps remain in use: Poly Haven `sand_03` for desert and `rocky_terrain_02` for the lunar interpretation. Poly Haven assets are CC0: <https://polyhaven.com/license>. The lunar map is a desaturated terrestrial material, **not** NASA regolith data. Terrain height is artist-defined procedural geometry, not a photogrammetric height scan. No additional remote assets or larger texture maps were added for this revision.

## Measurements

Using the vendored Three.js 0.180.0 module with placeholder Texture objects to isolate geometry construction:

| Metric | One active world |
|---|---:|
| Main terrain vertices | 248,065 |
| Main terrain triangles | 491,520 |
| Geometry attributes + indices, including skirts | 15.056 MiB |
| Construction time, local Node sample | 0.923 s desert / 0.825 s lunar |

Geometry bytes are CPU typed-buffer sizes and approximate the corresponding GPU buffer payload. They are not the browser tab's measured RAM, not a complete VRAM total, and exclude textures, temporary construction arrays, renderer targets, shadow maps, model buffers, and browser overhead. Theme switching should keep only one resident world. Construction now allocates exact-sized typed arrays and an Int32 vertex lookup table; BufferAttribute binds without copying. In a local Node sample, array-buffer growth was 16.125 MiB per world and first-run JS heap growth was 1.54 MiB. The lookup tables become collectible after construction. These are before/after samples, not an instrumented browser peak. No oversized attribute buffers survive, so a worker can transfer the buffers directly.

## Integration and validation

`WORLD_LIMIT=240`, `groundHeight(x,z,lunar)` and `createWorld(lunar,loader,anisotropy,preparedMeshes?)` preserve their original call forms; the optional fourth argument hydrates transferred Worker buffers without regenerating geometry. `group.userData.grounds` still holds the three ray-pickable terrain meshes; extent remains 1,024 m. `group.userData.geometryBytes` reports the resident geometry payload. The existing texture loader argument and map URL convention are unchanged.

Checks performed: JavaScript syntax check; actual construction of both worlds with vendored Three.js and measurement of buffers. All main-terrain normals were checked for finite unit length and all indices for valid vertex ranges. Final shader compilation, matched-camera comparison, shadows, and browser-memory validation are owned by the integrating agent. A screenshot alone cannot prove that every diagonal artifact was caused by the mesh, so compare with shadows disabled and flat gray material before calling the visual defect fixed.

## Final integration

The material also removes low-frequency exposure from repeated scan color, after the no-normal-map inspection still revealed a quilt pattern. Sand grain stays in the high-frequency normal and color components; small, non-periodic mineral variation replaces periodic ripple bands. Final navigation uses a cyan/dark-halo overlay rather than a faint world-space one-pixel line. See [final browser checks](revision5-verification.md) for observed results and the limits of the memory measurements.
