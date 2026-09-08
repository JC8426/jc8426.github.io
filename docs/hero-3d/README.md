# Research fleet hero experiment

Branch: `codex/interactive-drone-hero`. Production `main` remains unchanged.

## Preview

Run `python3 -m http.server 8080 --bind 127.0.0.1` from the repository root.

- Fleet experiment: http://127.0.0.1:8080/
- Original video comparison: http://127.0.0.1:8080/?hero=video

## Revision 3

Reference: the user's third aircraft screenshot and `swarm_formation.mp4`. The recording was inspected locally; it is not redistributed.

### Visual changes

- Lower central equipment cage, battery recessed below the flight controller, long carbon tube arms and tapered propellers; the rooftop battery tower and prop guards are removed.
- Compact roof electronics and sensor module, stereo bar, small routed wiring, clamps, exposed motor windings and belly skids.
- Near terrain: 128 m square with 320 subdivisions per side (0.4 m spacing). A lower-detail outer ring shares world-space UVs.
- Wider, smooth crater rims and shallow basins; asymmetric wind-shaped dune ridges and a more varied distant lunar horizon.
- Large evenly scattered boulders removed. Low embedded chips appear in irregular patches with ground-matched materials.
- Rotational-blur meshes no longer cast opaque ring shadows.

This remains a reference-guided artistic real-time model, not manufacturer CAD or a flight dynamics simulation.

### Fleet waypoint controls

1. Choose **Set waypoint**. This enters exploration and selects the fleet view.
2. Click or tap visible terrain. A ground marker and an indicative route appear.
3. All five aircraft leave individual manual mode and translate toward the target together, retaining the horizontal offsets present when the command was issued.
4. On arrival, the fleet holds position with a small hover animation. The target is the fleet centroid, not five aircraft converging into one point.
5. Set waypoint again to redirect from the current location. Dragging only adjusts the camera; sky clicks do not issue a target.
6. Pause freezes waypoint travel as well as manual and automatic motion. Cancel target stops the command and holds the current layout. Entering individual Pilot mode also cancels the active group command.

Targets are clamped so all aircraft centers remain inside the navigation bounds. Altitude follows terrain with clearance. The route is a straight horizontal group translation, not EGO-Planner, obstacle avoidance, or inter-vehicle collision planning. The visual reference's obstacles and planning algorithms are not claimed to be reproduced.

### Speed and existing controls

The base translation speed and automatic animation clock are both doubled at an unchanged pace setting. At default pace 0.6, manual and waypoint horizontal speed is 2.4 scene m/s (previous manual speed was 1.2). Rotor animation speed and yaw control are not artificially doubled.

U01–U05 buttons and direct model picking select aircraft. Fleet, Follow, Free and Onboard camera modes remain available. The overview now follows the actual group center, including during waypoint travel. Pilot uses WASD for translation, Q/E for yaw, R/F for height; the on-screen pad supports holds and keyboard nudges. Rejoin returns an individually controlled aircraft toward its current formation slot. Reset view restores the fleet overview. Esc exits the fixed-viewport exploration mode and restores normal page scrolling.

### Rendering behavior

Reduced-motion starts paused. Rendering is suspended when the hero is offscreen or the document is hidden. Blur, visibility changes, pointer cancellation and selection changes clear held controls. Pixel ratio is capped. All hero runtime dependencies are local. A WebGL failure restores the original video. Page focus changes use preventScroll to avoid jumping the document while selecting views.

## Files

- `scene.js`: fleet, selection, camera, input, telemetry and lifecycle.
- `research-drone.js`: reference-guided batched aircraft geometry.
- `world.js`: terrain, rock instances and material sets.
- `flight-state.mjs`: pure movement, speed, centroid, waypoint stepping and formation helpers.
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

Browser verification covers selection, camera switching, waypoint issue/arrival/redirection/cancellation, pause/resume, pace, theme mapping, full material loading, responsive bounds and console errors. Pure tests cover exact speed scaling, no overshoot, preserved offsets, target bounds and redirect continuity. Reference screenshots and videos remain local under ignored `tmp/hero-reference`.
