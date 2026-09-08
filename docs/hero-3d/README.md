# Interactive drone hero experiment

Branch: `codex/interactive-drone-hero`. The production `main` branch is unchanged.

## Preview

Run `python3 -m http.server 8080 --bind 127.0.0.1` from the repository root.

- Interactive experiment: http://127.0.0.1:8080/
- Previous video for comparison: http://127.0.0.1:8080/?hero=video

The page theme chooses the environment: Light → desert oasis; Dark → lunar surface and stars; Auto follows the operating-system preference. It also responds to system preference changes while in Auto mode.

Choose Explore scene to enable orbit, wheel zoom and right-drag pan. R resets the camera. Esc exits exploration and releases wheel/touch gestures for normal page scrolling. Pause flight freezes the flight/rotor/water animation. Reduced-motion starts paused. Offscreen and hidden-tab rendering is suspended; pixel ratio is capped for mobile.

## Implementation

`assets/hero-3d/scene.js` builds an original, procedural quadcopter model with rounded shell panels, four motor assemblies and articulated arms, screws, vents, feet, an illustrative D435-style stereo module and a roof-mounted 360-degree lidar housing. Both terrain scenes use true geometry. The desert includes a water surface and geometric palms; the moon includes craters, rocks and stars.

This is an artistic interactive prototype, not manufacturer CAD or an engineering-accurate Intel/DJI asset. It is not a flight-physics simulation. PBR materials and photographic sand textures improve surface detail; the procedural aircraft/foliage currently have a designed visualization aesthetic rather than a production photoreal scan. Further visual fidelity would require authored/licensed high-detail aircraft and vegetation assets.

The original video remains the WebGL-failure fallback. All hero runtime dependencies and textures are vendored locally; no CDN request is required to load the 3D hero. No application dependencies or live site configuration were changed.

## Sources and licenses

- Three.js 0.180.0, MIT: `assets/vendor/three/LICENSE.txt`.
- OrbitControls, RoundedBoxGeometry and Sky are from the same Three.js release.
- Sand color/normal/roughness textures: Rob Tuytel, Poly Haven, Aerial Sand, 1K JPG, CC0.
  - https://polyhaven.com/a/aerial_sand
  - https://polyhaven.com/license
- Model geometry and scene assembly were created for this experiment.

## Verification

- JavaScript syntax: `node --check assets/hero-3d/scene.js`.
- Static page and link checks: `python3 scripts/check-site.py`.
- Browser checks: theme → scene mapping, orbit and zoom, reset, pause/resume, language switching during exploration, Esc release, narrow viewport, and browser error log.
- Screenshot inspection is required before describing the current visual quality; a successful WebGL render alone does not establish photorealism.
