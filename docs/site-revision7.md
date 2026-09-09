# Website revision 7 — 2026-09-09

## Delivered

- User-facing Fleet terminology changed to Swarm. The opening shot follows the lead UAV for nine seconds, then pulls back into the swarm overview. Existing exploration controls and separation logic remain available.
- Lake-blue light content and gray dark content now continue the Hero palette.
- Project in Loop presents eight linked case studies in a horizontal, keyboard-accessible card track. Playback is optional and pauses around interaction; reduced-motion preferences are respected.
- projects.html adds bilingual keyword search and category filtering. Technical Notes links into the corresponding case sections.
- Six new case pages join the existing software/data and RCAP articles. Covers, contents navigation, language and theme controls are shared.
- Along the way uses a scrolling timeline. Research uses distributed autonomy, hypothesis-driven ROS simulation, and real-world validation as its three themes. The agent workflow shows human direction, implementation, testing, and a feedback path.
- The photo stream contains 24 aligned previews with original aspect ratios and links to the larger images. Original files are preserved.

## Validation

- 41 Node tests passed across flight state, terrain, resource handling, separation and project navigation.
- Static checker passed for 10 published pages: local assets, anchors, image alternatives and translation pairs.
- Inline and module JavaScript syntax checks passed; git diff whitespace check passed.
- Browser checks covered initial Follow and subsequent overview, category/search results, card navigation, wrapping, optional playback, note deep links, case-page theme/language controls, native workflow keyboard expansion, and desktop/mobile layout.
- At 390px viewport width the homepage document width was 390px. Four desktop gallery columns had matching bottoms and six images each.
- The project carousel correctly disables playback/navigation when all filtered cards already fit.

## Performance boundary

This revision adds no rendering framework or larger 3D scene buffers. Gallery previews limit decoded image dimensions; two research thumbnails also avoid full-size inline images. This is a resource reduction strategy, not a measured guarantee: a fresh continuous browser-process peak-memory profile was not performed for revision 7, so the approximately 500 MB ceiling remains to be verified under the user's browser and session conditions. JavaScript heap alone would not establish total browser/GPU memory.

## Design references

The card hierarchy and searchable index were informed by Aceternity Simple Blog with Grid and Blog with Search. The implementation is local static HTML/CSS/JavaScript; no paid component source was copied.

- https://ui.aceternity.com/blocks/blog-sections/simple-blog-with-grid
- https://ui.aceternity.com/blocks/blog-sections/blog-with-search

## Release scope

Experimental branch: codex/interactive-drone-hero. This revision does not merge into main or change the live GitHub Pages branch. Local framework experiments and unrelated raw assets are excluded from the commit.
