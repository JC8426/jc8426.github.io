# Revision 4 verification — 2026-09-09

## Results

- `node --test tests/flight-state.test.mjs`: 17 passing tests. Physical keyboard layouts and editable fields, route closure and proximity to all supplied waypoints, near-constant arc-length speed, all 16 preset formation transitions, map-edge expansion, remote return step bounds, and high-terrain clearance are covered alongside the existing movement tests.
- `python3 scripts/check-site.py`: three static pages pass local assets, anchors, image alternatives and paired translations.
- Browser: local static server at `127.0.0.1:8080`; Codex in-app browser, desktop 1280×720 and responsive 390×844. Both environments loaded without console/shader errors.
- Default page: fleet aggregate HUD, figure-eight progress, changing camera modes, no control dock in accessibility tree. Desktop follow shot and wide shot inspected visually.
- Explore: complete dock appears. On a control button with focus, physical W moved selected aircraft from `(0.155,3.146,4.955)` to `(0.164,3.146,4.971)` in a short press; Q changed heading. The first test revealed that an instantaneous keydown+keyup could be missed between render frames, so a one-frame press queue was added and the test repeated successfully. Sustained keydown at OS level was not timed by the browser tool.
- Waypoint: clicked visible terrain; readout changed to en route, then arrived/holding. A → line → S → matrix controls remained available after issuing a target.
- Mobile: all formation buttons remained within the 390×844 viewport (last row ended at y816, dock bottom y828), dock had no overflow; touch-pad keyboard activation and exit restored the aggregate HUD and bounded return state. This is responsive desktop emulation, not a real phone GPU measurement.
- Final code review identified and fixed: formation expansion beyond bounds; unbounded long-distance return to patrol; stale waypoint yaw after clamping. Review and pure tests do not establish collision-free flight from arbitrary manually displaced positions.

## Resource observations

The local diagnostic overlay reported roughly **55.4 MiB** of deduplicated geometry buffers and **64.6 MiB** estimated RGBA8/mipmap texture storage after both themes loaded. Full-fleet views were about 116–127 draw calls and 1.02 million visible-render triangles. Shadow passes are additional. Stable local samples were around 100–120 rendered fps; initial loading samples were lower. These are spot checks on this machine, not a P95 benchmark or a promise for visitors.

Geometry/texture estimates exclude environment targets, shadow targets, antialiasing, framebuffers and driver overhead. Actual GPU resident memory is not measured. The diagnostic is opt-in with `?heroStats=1`; normal visitors see no debug panel. No EGO optimizer, voxel map or ROS runtime was added, so planner memory costs in `ego-portability.md` are a separate future scenario.

## Visual acceptance boundary

Terrain is materially smoother, larger, and less cluttered. It remains synthetic: scanned surface textures are blended onto procedural terrain; the drone is reference-guided geometry. Extreme photorealism is **not achieved**. Remaining quality work should concentrate on a licensed scanned terrain mesh or calibrated height field, a suitable HDR lighting environment, richer aircraft surface detailing and shot composition. Merely raising every texture to 4K would substantially raise memory without resolving these structural limitations.

Reduced-motion initialization, hidden-page suspension and WebGL fallback are preserved in code; full browser failure/reduced-motion scenarios were not rerun in this revision. No native EGO planning or collision-avoidance performance has been tested.
