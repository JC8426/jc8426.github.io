# Terrain revision 4

The environment now spans 1,024 × 1,024 metres, with a 240 m flight-centre boundary. The detailed centre spans 256 m at 0.5 m grid spacing; a 512 m middle ring uses 2 m spacing and the horizon ring uses 4 m spacing. The five-aircraft figure-eight route fits within the detailed centre.

The surface combines smooth geometric dunes / worn crater bowls with the existing locally stored CC0 photographic PBR textures. Three translated texture samples are blended with continuous low-frequency weights in the colour, tangent-space normal and roughness channels. This reduces recognisable tiling without introducing UV rotation errors in normal maps. Geometry does not try to reproduce individual grains; the normal maps provide those details. All separately scattered pebble meshes have been removed.

The lunar texture remains desaturated terrestrial `rocky_terrain_02` from Poly Haven, not measured lunar regolith. Sand uses Poly Haven `sand_03`. Existing source attribution and the [Poly Haven CC0 license](https://polyhaven.com/license) continue to apply. No new externally sourced assets were added. This is a procedural real-time environment with photographic surface material; it is not a photogrammetric reconstruction and should not be described as having achieved extreme photorealism.

## Resource evidence

A Node check against the vendored Three.js build, using placeholder textures, reported the following for each theme:

- 720,896 ground triangles, plus small boundary skirts.
- 26,227,204 bytes (25.0 MiB) of typed geometry attributes and indices, including skirts.
- Approximately 0.36 s desert / 0.45 s lunar construction on this development machine. This is not a browser or mobile benchmark.
- All generated position values were finite.

Both themes resident together require about 50.0 MiB of geometry buffer storage, before textures, framebuffers and the aircraft. Three.js also keeps CPU-side typed arrays; this number is not total RAM or measured VRAM. The six existing textures have not increased in pixel dimensions. The surface shader now performs three aligned samples per PBR channel; browser frame-time verification is still required, particularly on mobile GPUs.

The lower-resolution rings are intended for distance. The complete 240 m exploration boundary extends into the 2 m ring, so close ground inspection at its edge has less geometric detail than the central patrol area. Shader material detail remains continuous. Shared analytical boundary normals and shallow skirts limit visible LOD seams; the skirt surfaces are excluded from waypoint raycasting.

## Composition pass after browser review

A subsequent browser review found that the first desert pass still resembled a uniform textured sheet. The desert now uses seven irregular, tapering dune chains with asymmetric cross-sections instead of the earlier periodic base wave. Two smaller near-field ridges frame the route; higher chains farther away create a layered horizon. The scanned sand tile covers 2.8 m instead of 7 m, reducing the oversized grain appearance, and the sand material tint is lighter. No extra meshes, textures or geometry resolution were added for this pass.

A 2 m sample sweep over the ±240 m flight region measured desert ground heights from approximately 0.16 to 63.67 m, with a maximum sampled local slope of 0.748 (about 37 degrees). The origin ground height is approximately 5.30 m. These are procedural model units, not surveyed data. Aircraft and camera clearance must continue to use `groundHeight`, rather than an assumed zero-height plane. Lower side lighting and restrained distance fog are necessary for the ridges to read clearly; those settings belong to `scene.js`.
