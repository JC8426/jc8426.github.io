# Glacial lagoon prototype

`assets/hero-3d/glacier.js` supplies a separate, authored 3D lagoon rather than recolouring the sand height field. Its scope is a lightweight art-direction prototype; it is not photogrammetry, a scanned ice asset, fluid simulation, or a claim of photographic equivalence to the reference video.

## Integration

- `createGlacierWorld()` returns a Three.js Group with `userData.grounds` for ray picking, `extent: 1024`, `lunar: false`, `environment: 'glacier'`.
- `glacierHeight(x, z)` supplies a conservative ice-cap/water surface for clearance calculations. Water is zero. Ice-wall edges are conservatively expanded for aircraft clearance; collision shapes are therefore approximate.
- `updateGlacier(group, timeSeconds)` updates only a shared water shader uniform. No geometry rebuild, CPU texture generation, or per-frame allocation occurs. A single 512 × 512 planar reflection is rendered by the water mesh.
- The environment-disposal traversal must call `group.userData.dispose()` in addition to freeing geometry/material resources: the Water reflection target is held in its constructor closure. The callback also releases the water normal map. Ice shares one material across the environment.

## Visual construction

Twelve non-circular iceberg masses frame an open water channel, with 32 small ice pieces near the banks. Near ice has steep walls and a gently eroded cap; larger distant masses establish scale. Frozen faces use restrained blue strata and continuous, non-tiled procedural detail. The lagoon uses the official Three.js r180 Water shader, a 512² reflection of the local ice geometry, and an original seamless 256² Fourier-wave normal texture. Ice caps have a strongly asymmetric sloping profile, lobed broken footprints, and recessed cliff bands rather than uniform cylinder tops.

The central 80 × 40 metre patrol rectangle is water, with no ice crossing the default route. The default elevated camera sees a water foreground and layered ice in the distance. A neutral sun, cool atmospheric haze and a fog far distance above 500 m are recommended to avoid a warm sand-scene appearance.

## Resource accounting

Node geometry inspection: 45 meshes, 18,564 vertices, 868,748 bytes (0.829 MiB) of position/normal/colour/index buffers. The water adds approximately 0.334 MiB of normal-map storage including mipmaps and 2 MiB for the reflection colour/depth target. CPU/GPU geometry duplication and renderer bookkeeping are additional; these figures are not Chrome process memory. Existing shadow maps and environment maps remain the responsibility of the scene. The stated 500 MB browser budget still requires browser sampling after integration.

Validation: all generated attribute values are finite; the entire integer-sampled central patrol rectangle reports water height zero. Shader compilation, appearance and integrated memory must be verified in the browser.

## Third-party source

`assets/vendor/three/Water.js` is sourced from https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/objects/Water.js under the existing vendored Three.js MIT license. Local changes use the sibling Three module and expose `disposeReflection()` to free the closure-held render target.

The integrated water uses a lower normal-incidence reflectance (0.025) to avoid a silver-mirror appearance; wave scale is 12. Navigation overlays are kept on a separate camera layer, excluded from the reflection camera.
