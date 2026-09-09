# Research fleet hero experiment

Branch: `codex/interactive-drone-hero`. Production `main` remains unchanged.

## Preview

Run `python3 -m http.server 8080 --bind 127.0.0.1` from the repository root.

- Fleet experiment: http://127.0.0.1:8080/
- Original video comparison: http://127.0.0.1:8080/?hero=video

## Revision 6 (current)

Daylight is an authored glacial lagoon; lunar night is retained. The bottom introduction, left telemetry board and right camera rail frame the scene. Selected aircraft accept keyboard input immediately in exploration. Pace defaults to 1.5× with a 3× ceiling. A conservative 4.4 m swept separation guard stops visual aircraft overlap; it is not EGO obstacle avoidance.

The ice field adds a bounded 512² planar reflection, explicitly disposed when leaving the environment. Lunar geometry builds in a renderer-free Worker, and homepage cards use bounded thumbnails while retaining full originals. Navigation annotations are excluded from that reflection. Cinematic single-aircraft shots isolate their subject. Default remains realtime 3D, pending any choice to use a separate video-first entrance.

[Revision 6 verification and limits](revision6-verification.md) · [Glacier implementation](glacier-environment.md).

## Revision 5 (historical baseline)

The homepage uses an offline GLB with shared near/far body LOD, one active terrain, transferable/reused terrain buffers and direct ASTC KTX2 uploads (native JPEG fallbacks where ASTC is unavailable). Desert lighting uses a licensed 1K pure-sky HDR. The navigation camera is higher and fits the fleet and target; cyan routes have a dark pixel-width halo and a stable target badge.

Repeated low-frequency scan illumination and normal lumps are removed from sand shading. The trial periodic ripple overlay was removed following user feedback. Fine grains and irregular mineral variation remain. Terrain self-shadow acne is avoided while retaining aircraft shadows.

The 500 MB Chrome-tab budget is separate from the scene estimate: final-build observations and limitations are recorded in [revision 5 verification](revision5-verification.md). Intermediate runtime-transcoding builds exceeded the budget and were rejected. Runtime no longer downloads or instantiates a Basis/WASM transcoder. Refresh, teardown and video fallback explicitly release 3D resources.

[Model and build pipeline](../../assets/hero-3d/drone/README.md) · [HDR source](../../assets/hero-3d/lighting/README.md) · [Implementation plan](revision5-plan.md).

## Revision 4 (historical baseline)

Default mode runs the supplied closed figure-eight route at 2.4 horizontal scene m/s at the default pace. XY coordinates map to world XZ. The supplied Z=1 is interpreted as +1 m relative to the previous 4.3 m cruise clearance, so nominal patrol clearance is 5.3 m above local ground. This is visual terrain following, not a flight controller.

The automatic director cycles wide fleet (15 s), stationary broadcast tracking (12 s), individual follow (11 s), onboard (7 s), and wide fleet (12 s). Camera changes are editorial cuts with damped tracking inside each shot. It freezes for reduced motion or pause. Selected models are hidden only for their onboard view; labels and selection rings are absent in cinematic mode.

**Browse scene / 浏览场景** enters the full viewport controls. All secondary controls are hidden and inert before entry. The initial HUD reports mean fleet clearance, mean 3D speed and route progress; exploration reports the selected unit. Exiting returns toward the nearest patrol point at bounded horizontal speed, then resumes the loop. Theme changes preserve clearance. Navigation links exit exploration.

Physical WASD/QE/RF key codes are handled at window level only while exploration and pilot mode are active. Text fields retain their normal input. A short key press is consumed for at least one simulation frame even if keyup arrives before the next frame. Blur, visibility changes, mode/selection changes, and text-input focus clear input. Pilot resumes a paused scene explicitly.

A / line / S / matrix formations use five unique slots and minimum-travel assignments biased toward separation. Tests cover all preset-to-preset transitions with >3.7 m horizontal separation. This is **not** a collision guarantee for arbitrary manual positions, obstacle avoidance, or native EGO-Swarm. Waypoints preserve the active layout; formation expansion near navigation limits recenters the fleet.

Terrain now spans 1024 m with ±240 m flight bounds: a 256 m / 0.5 m centre, 512 m / 2 m middle ring and 1024 m / 4 m horizon. Irregular dune chains, eroded crater profiles, synchronized offset PBR sampling, continuous edge normals and terrain shadows replace the smaller world. All separate pebble meshes are removed. [Terrain details](terrain-revision-4.md).

The scene remains a procedural terrain reconstruction with photographic surface textures and a reference-guided drone model. **Extreme photorealism is not yet achieved**: it does not use a scanned terrain mesh, calibrated HDR environment or manufacturer CAD. A reviewed Aerial Sand texture was rejected because its footprints/vehicle tracks did not fit this setting; no additional raster assets were shipped.

See [EGO portability and CPU/GPU budget](ego-portability.md) and [verification](revision4-verification.md). Developer-only `?heroStats=1` displays rendered frame rate, draw calls, triangles and deduplicated geometry/texture estimates; it is absent from the normal homepage. These estimates exclude shadow/environment/framebuffer targets and driver overhead, and do not measure actual GPU resident memory.

## Revision 3 (historical baseline)

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
- `world.js`: terrain LOD rings, scanned surface materials and height queries.
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
