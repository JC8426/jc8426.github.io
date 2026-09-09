# Revision 5 — visual and memory verification

## Scope and result

The user approved terrain/UAV/lighting upgrades under a 500 MB Chrome-tab budget, then prioritized desert texture and route visibility during development. The final implementation removes regular terrain shading, replaces the runtime-built UAV with an offline GLB, loads one terrain at a time, and makes navigation overlays readable on bright sand. This remains an authored real-time scene, not a scanned lunar landscape or manufacturer CAD; it should not be advertised as indistinguishable from photography.

## Visual findings and changes

Fixed-shot inspection showed a smooth gray terrain but a repeating quilt in the fully textured material, even after disabling the normal map. The source scan contains low-frequency albedo illumination as well as broad normal-map lumps. The shader now removes those repeated low-frequency contributions, preserves fine sand and adds only irregular mineral variation. A trial periodic wind-ripple layer was removed after the user's feedback because it added visual interference.

Terrain uses compact indexed meshes and continuous height-derived normals. Ground self-shadowing was disabled to avoid grazing-angle acne; UAV shadows remain. This trades terrain cast shadows for stable surface shading, and is not a physically complete lighting model.

A 1K CC0 pure-sky HDR provides desert reflections; its brightest direction is matched by the sun. Lunar fill uses a small neutral environment instead of blue atmospheric reflections. The GLB has near/far body detail, finer carbon-fibre UV scale, machined frame openings, clamps, wiring and dielectric lens clearcoat. Its geometry and textures are shared among all five aircraft.

Waypoint selection is elevated and fitted to fleet/target extents. The route is a pixel-width cyan line with a dark halo, and a constant-screen-size target badge. The route is deliberately an overlay (visible over terrain), not evidence of a collision-free plan. Default cinematic mode hides the control visuals. Browser test: a point at X50.5 / Z11.5 was selected, fleet travelled and held; the full route remained clearly visible after arrival.

## Resource strategy

- One current world. Previous geometry/material/texture resources are disposed.
- Terrain arrays transfer to a short-lived Worker and are reused on normal theme changes rather than reallocated.
- Supported GPUs upload pre-encoded ASTC 4×4 KTX2 blocks directly; no runtime Basis/WASM transcoder. Non-ASTC GPUs use 1K color / 512px normal/roughness native JPEG fallbacks.
- Terrain loading is serialized; superseded fetches and geometry workers are cancelled.
- Browser refresh/page destruction explicitly releases the renderer, shadow targets, scene and model cache; video fallback begins only after 3D cleanup.
- Video is not decoded alongside 3D. Below-fold images use lazy loading.
- Drawing buffer is capped at 2.25 million pixels (desktop DPR ≤1.4); inspection mode alone requests a preserved drawing buffer.

Normal scene diagnostics report about 17.3 MiB geometry and 9.5–9.6 MiB texture blocks for ASTC, excluding render targets, shadow buffers, driver and browser overhead. The GLB is 2.25 MiB on disk. These numbers are not total tab RAM.

## Chrome observations

Same Chrome profile and native tab-memory label as the user's screenshot. Original user screenshot: 431 MB; initial live V4 inspection: 327 MB (different time/state).

An intermediate runtime-transcoding implementation reached 586 MB and a repeatedly reloaded/debugged tab later reported 624 MB. That approach was rejected. The final path removes runtime transcoding and adds explicit page teardown and buffer reuse.

A newly opened final-build tab reported 430 MB after loading the moon, 428 MB after loading the desert, and 439 MB after switching back to the moon. Four rapid theme taps settled on the correct desert state at 454 MB without new console errors. A subsequent refresh with explicit page teardown reported 453 MB. These are observed samples, not a continuous peak trace or a guarantee across browser extensions/devices. The 500 MB requirement must be checked using the actual Chrome tab reading, not by presenting the smaller scene-buffer estimate as total RAM.

## Checks

- **23 tests passed.** Flight/resource tests cover keyboard input, patrol continuity, preset separation, waypoint bounds, high terrain, shared-resource disposal, elevated framing, transferable geometry hydration and malformed ASTC mip ranges.
- Offline GLB validator checks framing, buffer ranges, indices and finite positions.
- Static site checker covers 3 pages, local assets, anchors, image alternatives and translation pairs.
- Fixed shot tools: `?heroInspect=desert&shot=wide`, `shot=low`, `shot=close`, and `surface=gray|normal|no-normal|no-shadow`. Normal homepage loads no inspection module.
- V4 comparison is preserved only in ignored `tmp/hero-v4`, served at localhost:8081 during development; it is not published.

Full native EGO planning and photorealistic asset reconstruction are outside this implementation. No new paid assets or services were used.
