# Research fleet hero experiment

Branch: `codex/interactive-drone-hero`. Production `main` remains unchanged.

## Preview

Run `python3 -m http.server 8080 --bind 127.0.0.1` from the repository root.

- Fleet experiment: http://127.0.0.1:8080/
- Original video comparison: http://127.0.0.1:8080/?hero=video

## Revision 2

This revision uses the user's three aircraft reference photos and 34-second reference screen recording. It removes the oasis entirely, replaces the sealed white aircraft with an original reference-guided research platform, introduces five selectable aircraft and adds camera/pilot controls.

### Aircraft and environments

- Carbon-style stacked plates, standoffs and fasteners.
- Exposed electronics, processor heat sink and sockets.
- Battery, straps, power wiring and connector.
- Front stereo sensor, compact roof scanning unit, motor windings and prop guards.
- Five aircraft share batched geometry and materials to reduce draw overhead.
- Light theme: dry desert dunes and scattered stones, with no water or vegetation.
- Dark theme: sculpted craters, varied rocky ground and stars.
- Separate photographic color, normal and roughness material sets for the two environments; 2K albedo and 1K detail maps. Rocks use averaged vertex normals and multiple instanced geometries.

The model is an artistic approximation guided by photos, not measured manufacturer CAD. The scene is not a flight-dynamics, collision-avoidance or lunar-flight simulation. Telemetry is calculated from the scene's movement and explicitly labeled as simulated.

### Interaction

- Choose U01–U05 to select an aircraft. Selection enters exploration and follows the selected unit.
- In exploration, clicking a visible aircraft also selects it. Dragging rotates instead of selecting.
- Fleet: formation overview. Follow: orbit the selected moving unit. Free: independent orbit/pan. Onboard: camera at the selected aircraft's nose; its own model is hidden from this camera.
- Pilot: toggle manual control for the selected aircraft. WASD translates, Q/E changes yaw, R/F changes height.
- The on-screen flight pad supports pointer holds and keyboard-activated nudges.
- Rejoin: release the selected unit back into automatic formation.
- Pause/Resume freezes/resumes both automatic and manual motion.
- Pace controls simulation speed. Altitude above local terrain, current movement speed and accumulated path length are calculated per aircraft.
- Reset view returns the camera to the formation overview.
- Exploration pins the hero to the viewport. Esc exits, restores the entry scroll position, clears held controls and returns wheel/touch input to ordinary page navigation. Unselected manually controlled units hover until rejoined.
- Manual movement is bounded to the scene and constrained to a minimum terrain clearance. It does not avoid rocks or other aircraft.

### Rendering behavior

Reduced-motion starts paused. Rendering is suspended when the hero is offscreen or the document is hidden. Blur, visibility changes, pointer cancellation and selection changes clear held controls. Pixel ratio is capped. All hero runtime dependencies are local. A WebGL failure restores the original video. Page focus changes use preventScroll to avoid jumping the document while selecting views.

## Files

- `scene.js`: fleet, selection, camera, input, telemetry and lifecycle.
- `research-drone.js`: reference-guided batched aircraft geometry.
- `world.js`: terrain, rock instances and material sets.
- `flight-state.mjs`: pure movement and formation helpers.
- `scene.css`: responsive hero controls.
- `tests/flight-state.test.mjs`: movement, altitude, boundary and formation checks.

## Sources

- User reference images: `assets/uav_model/prototype1.JPG`, `prototype2.png`, `prototype3.png`. Used for modeling reference, not added to the public branch in this change.
- User screen recording: inspected locally for follow/free/onboard camera behavior, speed control and telemetry. The recording is not redistributed.
- Three.js 0.180.0 and its addons, MIT; see `assets/vendor/three/LICENSE.txt`.
- Poly Haven Sand 03, CC0: https://polyhaven.com/a/sand_03
- Poly Haven Rocky Terrain 02, CC0: https://polyhaven.com/a/rocky_terrain_02
- License: https://polyhaven.com/license
- Rocky Terrain 02 is desaturated for the lunar artistic environment; it is not NASA lunar imagery.

## Verification

Run:

```sh
node --test tests/flight-state.test.mjs
node --check assets/hero-3d/scene.js
node --check assets/hero-3d/research-drone.js
node --check assets/hero-3d/world.js
python3 scripts/check-site.py
```

Browser verification covers selection, camera switching, manual ascent, pause/resume, rejoin, pace adjustment, theme mapping, language changes, full material loading, responsive bounds and console errors. Reference screenshots and videos remain local under ignored `tmp/hero-reference`.
