# Revision 6 — verified behavior and visual direction

This branch remains a realtime 3D autonomy demonstration. The daytime experiment is now a glacial lagoon; night remains lunar. The DJI reference was viewed, including its lagoon/ice sequence around 0:48. It informed dark water, pale ice, foreground/background separation and lower camera angles. This is authored procedural scenery and is **not** equivalent to the reference's photographic quality. No YouTube footage was copied into the website.

## Delivered

- Hero introduction returned to the bottom; live fleet/aircraft dashboard on the left; unique camera buttons on the right; detailed dock in exploration only.
- Selecting an aircraft immediately activates pilot. A first flight key in exploration can activate the already-selected aircraft. Browser modifier shortcuts are excluded from flight input.
- Default pace 1.5× (nominal horizontal 6 scene m/s), maximum 3× (12 scene m/s). Rejoin/holding-slot motion is bounded by the same speed.
- Swept horizontal separation guard with a 4.4 m conservative rotor envelope; motion and navigation progress are accepted by the same fraction. It can stop movement, but does not perform obstacle planning or active rerouting.
- Authored glacial geometry, cold-water shading, a 512² planar reflection and an original 256² wave-normal map. Reflection does not include navigation overlays.
- Single-aircraft cinematic follow shots isolate the subject; fleet views still show the complete swarm.
- Clean loading treatment; no warm canyon poster flashes before the ice scene. On leaving a page, 3D resources are released even for history caching; back navigation rebuilds the scene instead of retaining a second renderer.

## Browser checks

Desktop 1280×720 and responsive 390×844 inspected. Introduction, left dashboard and right controls fit without viewport overflow. Debug statistics were visible only in the test URL.

Direct pilot test: entered exploration, clicked U03 without using Pilot, then W/Q changed the selected pose from `(-9.764,5.300,15.460)` to `(-9.788,5.300,15.490)` and changed heading. The pace control reached 3.0× with its End key.

Collision integration test: at 3×, U01 approached a neighbour through the same command path used by the touch pad. The dashboard displayed spacing protection. A second inward command left the accepted pose unchanged at `(-13.010,4.358,18.486)`; an outward command was accepted and restored the clear spacing state (minimum 5.7 m).

## Resource boundary

Glacier mesh about 0.829 MiB; one 512² reflection target about 2 MiB; normal texture about 0.334 MiB. These are payload estimates, not whole-tab RAM. Total glacier-scene geometry observed about 3.1 MiB. Lunar mesh generation was split into pure math/typed-array modules, so its Worker no longer imports Three.js; redundant lunar vertex-color buffers were removed, reducing that geometry payload to about 12.22 MiB. The drawing-buffer budget is 1.8 million pixels with desktop DPR ≤1.35.

Chrome contained multiple identically titled pages. Early 360–375 MB readings could not be assigned to V6 and were excluded. A version-tagged navigation from an old page showed 520 MB; an independent `?revision=6&test=fresh` page showed 470 MB. This motivated explicit history-page teardown and the smaller drawing-buffer cap. Readings are samples, not a continuous peak guarantee. Subsequent refresh testing showed 615 MB while several local test copies were open. Those task-created copies were closed, leaving the original page; the version-tagged single page then reported 413 MB with the final drawing-buffer cap and cleanup policy. Old-page and multi-copy readings are retained here rather than being presented as a successful single-page budget result.

## Checks and limits

Pure tests cover swept crossings, contact and retreat, initially overlapping states, map bounds, repeated high-speed approaches, preset transitions and browser modifier keys. Glacier tests check finite mesh attributes, indices, the clear figure-eight corridor and disposal hooks. Static site and GLB checks remain applicable.

This is basic visual anti-penetration, not a certified flight safety layer, full physics, or native EGO-Swarm. Ice-wall clearance is conservative and can raise altitude quickly. The exact DJI clip described by the user was not found in the inspected local branch assets; the film-vs-realtime preference question remains optional, and this revision preserves realtime behavior.

### Final memory work

The old long-running renderer remained above budget in some observations (Chrome task manager around 554–555 MB; an old tab label 558 MB). Its image cache alone was 71.5 MB. Homepage card thumbnails were then resized to at most 1024×768, preserving all originals and case-study sources. The RCAP preview no longer decodes its 4032×3024 original just to render a card. The nine previews have a combined decoded-size estimate of about 21.4 MiB, versus much larger originals.

A new, version-tagged `?revision=6&fresh=final` page reported **439 MB in lunar mode**, then **461 MB after switching to the glacier** after those changes. The final suite has **38 passing tests**. This is a valid observed sample for the final code, but not proof that every old renderer, extension configuration or continuous peak remains under 500 MB. The old oversized samples are deliberately retained in this record.
