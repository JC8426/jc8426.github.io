# Desert lighting HDRI

`qwantani_puresky_1k.hdr` — **Qwantani (Pure Sky)**, original by Greg Zaal, sky editing by Jarod Guest, Poly Haven.

- Asset page: https://polyhaven.com/a/qwantani_puresky
- Official metadata: https://api.polyhaven.com/info/qwantani_puresky
- Official file manifest: https://api.polyhaven.com/files/qwantani_puresky
- Download: https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/qwantani_puresky_1k.hdr
- License: **CC0**, https://polyhaven.com/license
- Downloaded 2026-09-09. 1,142,401 bytes; 1024×512 RGBE HDR.
- Verified manifest MD5: `086b9fb2feb8f641b0d485c73dfb7cdc`.

Poly Haven identifies this as an edited sky-only version of Qwantani: clear, afternoon, high-contrast natural sky. It supplies directional highlights and sky fill without landscape/vegetation/building imagery in reflections. Use only for the terrestrial desert theme, never the lunar theme. The original capture is not claimed to be in a desert.

## Lighting alignment

The brightest source pixel is approximately (614,176), measured by decoding the HDR through Three.js r180 HDRLoader and searching Rec.709-weighted linear luminance. With Three's equirectangular UV convention and `flipY=true`, this corresponds approximately to elevation **27.95°**, texture longitude **36.04°**, source-direction vector **(0.7143, 0.4687, 0.5197)** before environment rotation. This is texture-space alignment, not geographic compass bearing. Match the directional sun light to this direction (after any `scene.environmentRotation`) so shadow direction agrees with specular reflections. The 1K sun pixel location is approximate.

Use HDRLoader's default HalfFloatType, prefilter with PMREMGenerator, then dispose the original decoded HDR texture. Set the resulting PMREM texture as `scene.environment`; a procedural sky may remain the background if its sun is aligned. Dispose the retained PMREM render target when releasing the environment. Avoid repeatedly creating PMREM textures on theme changes.

Raw decoded 1K RGBA half-float input costs approximately **4 MiB** before prefiltering; input can be released after PMREM. PMREM and loader temporaries add to peak memory and must be counted in the complete scene budget.

## Loader

Official r180 `HDRLoader.js` is vendored alongside the r180 `RGBELoader.js` compatibility wrapper under `assets/vendor/three/`; existing Three.js MIT license applies. Import **HDRLoader** directly to avoid RGBELoader's deprecation warning. Neither needs an additional decoder library.
