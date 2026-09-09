# Revision 6 — cinematic swarm layout and direct control

User request: DJI film-like aesthetics while keeping an interactive autonomy demonstration; consider glacial scenery; selected UAV should accept keys immediately; default 1.5× and higher speed ceiling; basic visible collision prevention; lower hero introduction, left dashboard, right controls. Continue the 500 MB browser-tab budget.

Implementation:
- Keep the realtime architecture for this branch's glacier prototype; daytime becomes an authored glacial lagoon, nighttime remains lunar. A separate asynchronous preference question about video-first versus always-3D remains optional; no telemetry is placed on unrelated video footage.
- Direct selection activates pilot; first flight key in exploration can also activate the selected craft. Default pace 1.5×, ceiling 3×.
- Conservative 4.4 m horizontal rotor envelope, swept relative movement checks across all modes, matched accepted progress and actual distance accounting.
- Lower introduction, left fleet/aircraft board, right unique camera shortcuts, full dock only in exploration.
- Bounded 512² water reflection target with explicit teardown; no high-resolution screen-space effects.

Reference: DJI Mavic 4 Pro official YouTube film https://www.youtube.com/watch?v=BNEmDcQr6hk, visually inspected including the glacier/lagoon sequence around 0:48. Existing local main/master markup points at the roughly 7-second Kling canyon clip; the old master hero.mp4 inspected from Git is an 8-second diagram, and the earliest version a 6-second background. The exact claimed DJI edit was not located. No YouTube footage was downloaded or redistributed.
