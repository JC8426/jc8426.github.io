# Revision 5 — photorealism under a browser memory cap

Approved scope: higher-fidelity terrain/materials and GLB drone, 500 MB browser-tab acceptance ceiling (same Chrome UI metric as user), higher waypoint camera. No new navigation/planning feature.

1. Record existing Chrome baseline: live v4 tab AX memory reported 327 MB at inspection; user's earlier screenshot 431 MB. Neither is a continuous peak measurement.
2. Preserve v4 in ignored tmp/hero-v4 on localhost:8081 for fixed-shot comparisons.
3. Eliminate periodic shader weights and terrain self-shadow acne; continuous height normals, compact indexed terrain.
4. Offline GLB with detailed and distance LOD, shared across five aircraft.
5. One active world, worker-generated transferable geometry, GPU-compressed terrain maps, explicit disposal, no simultaneous video decoder, below-fold image lazy loading.
6. Higher waypoint selection camera and bounded fit of fleet/goal; retain user orbit/zoom after framing.
7. Fixed-shot material/normal/shadow inspection, both themes, repeated theme changes, interaction checks, real Chrome memory observations, source/limitations report.
