# Reference-guided research quad — revision 5

Original model authored from Johnny's research-quad references, not manufacturer CAD, a certified Intel sensor model, or photogrammetry. The asset improves the low-profile open-frame silhouette and manufacturing cues; it does not establish an “extreme photorealism” claim by itself.

Changes versus revision 4:
- Tapered, waist-cut carbon plates with actual mounting openings and edge bevels.
- Machined arm clamps, hex fasteners, elastomer PCB mounts, three-phase motor leads, rear antenna and strain-relieved signal cable.
- Layered optical bezels and recessed apertures, removing oversized white reflection dots.
- Battery remains inside the lower cage. Camera and compact lidar retain the functional reference arrangement.
- Small woven carbon base-color, normal and packed roughness/metalness maps are embedded in the GLB. They are procedurally baked original material samples, not scanned carbon assets.
- Near and far bodies share materials. Five aircraft share both geometry and textures. Three.js LOD selects the lower-detail body at 24 scene units with hysteresis; rotor attachment order remains unchanged.

## Reproduce

From the website root, using Node 22.15+ and the existing `sharp` package:

```sh
node scripts/build-drone.mjs
node scripts/validate-drone.mjs
```

The builder uses vendored Three.js r180 geometry helpers and a small GLB writer. It does not require Blender, modify npm configuration, or download build inputs. `GLTFLoader.js` is vendored from official Three.js r180 with only its local BufferGeometryUtils import adjusted; the existing Three.js MIT license applies.

## Runtime contract

`await loadResearchDroneAsset()` once, then `createResearchDrone()` returns `{root,rotors}` synchronously. Root child 0 is an automatically updated LOD body; children 1–4 are rotor groups. Cloning the root with `.clone(true)` continues sharing geometry and materials. Labels are separate sprites created by the existing `unitLabel()` helper.

## Budget and validation

See `asset-stats.json` for reproducible counts. The GLB is about 2.25 MiB; combined near/far body and rotor buffers are about 2.23 MiB. Three 256×256 RGBA mipmapped textures occupy about 1 MiB on GPU. CPU copies and loader's transient GLB buffer are additional, browser-dependent overhead. This is an asset estimate, not a measurement of tab RAM or VRAM. The entire scene still requires browser measurements against the 500 MB budget.

`validate-drone.mjs` checks GLB framing, expected nodes, buffer bounds, finite vertex data, index bounds and file budget. Visual rendering and close-up quality must be checked in the final scene lighting.
