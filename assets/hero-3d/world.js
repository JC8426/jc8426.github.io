import * as T from '../vendor/three/three.module.js';
import {buildTerrainMeshes} from './terrain-mesh.mjs';
export {groundHeight} from './world-math.mjs';

// The patrol occupies the detailed centre; distant terrain provides a horizon.
export const WORLD_LIMIT=240;
// Blend translated samples over broad, irregular patches. All PBR channels
// use the same weights so photographed relief, colour and roughness align.
// Translation preserves tangent-space normal orientation (rotating UVs would
// also require rotating the sampled normals).
function scannedSurface(material,lunar){
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   float terrainHash(vec2 p) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
   }
   float terrainNoise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*f*(f*(f*6.-15.)+10.);
    return mix(mix(terrainHash(i),terrainHash(i+vec2(1.,0.)),f.x),
      mix(terrainHash(i+vec2(0.,1.)),terrainHash(i+vec2(1.,1.)),f.x),f.y);
   }
   vec3 terrainWeights(vec2 uv) {
    // Non-periodic, smoothly warped patches: no directional sine bands.
    vec2 warp=vec2(terrainNoise(uv*.17),terrainNoise(uv*.17+19.7));
    vec2 p=uv*.23+warp*1.7;
    vec3 w=vec3(terrainNoise(p),terrainNoise(p+23.2),terrainNoise(p-17.8));
    w=exp((w-max(w.x,max(w.y,w.z)))*10.);
    return w/(w.x+w.y+w.z);
   }
   vec3 terrainBlendWeights;
   vec4 terrainSample(sampler2D tex, vec2 uv) {
    vec3 w = terrainBlendWeights;
    return texture2D(tex,uv)*w.x + texture2D(tex,uv+vec2(.371,.619))*w.y + texture2D(tex,uv+vec2(.713,.237))*w.z;
   }
   ${lunar?'':`
   vec4 terrainSandDetail(sampler2D tex, vec2 uv) {
    vec3 w=terrainBlendWeights;
    vec3 fine=terrainSample(tex,uv).xyz*2.-1.;
    // The scan includes broad uneven ground. Remove that low-frequency
    // slope while retaining its real fine grain; geometry supplies dunes.
    vec3 coarse=(textureLod(tex,uv,5.).xyz*w.x
      +textureLod(tex,uv+vec2(.371,.619),5.).xyz*w.y
      +textureLod(tex,uv+vec2(.713,.237),5.).xyz*w.z)*2.-1.;
    vec2 grain=fine.xy/max(fine.z,.2)-coarse.xy/max(coarse.z,.2);
    // Once the screen footprint exceeds the detail band, smoothly remove
    // it rather than subtract a sharper fixed mip from a blurrier sample.
    vec2 texels=vec2(textureSize(tex,0));
    vec2 dx=dFdx(uv)*texels,dy=dFdy(uv)*texels;
    float footprint=max(dot(dx,dx),dot(dy,dy));
    float lod=.5*log2(max(footprint,1.));
    grain*=1.-smoothstep(2.5,5.,lod);
    return vec4(normalize(vec3(grain,1.))*.5+.5,1.);
   }
   `}
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   terrainBlendWeights = terrainWeights(vMapUv);
   vec4 sampledDiffuseColor = terrainSample(map, vMapUv);
   ${lunar?'':`
   // De-light the scan locally: repeated low-frequency exposure in the source
   // photograph was visible as a diamond quilt even with normal maps disabled.
   vec3 coarseColor=textureLod(map,vMapUv,6.).rgb*terrainBlendWeights.x
    +textureLod(map,vMapUv+vec2(.371,.619),6.).rgb*terrainBlendWeights.y
    +textureLod(map,vMapUv+vec2(.713,.237),6.).rgb*terrainBlendWeights.z;
   vec3 grainColor=clamp(sampledDiffuseColor.rgb/max(coarseColor,vec3(.025)),vec3(.65),vec3(1.4));
   float mineral=.55*terrainNoise(vMapUv*.15+3.1)+.30*terrainNoise(vMapUv*.43-7.2)+.15*terrainNoise(vMapUv*1.2+11.);
   sampledDiffuseColor.rgb=vec3(.34,.245,.14)*mix(.88,1.08,mineral)*mix(vec3(1.),grainColor,.65);
   `}
   diffuseColor *= sampledDiffuseColor;
   ${lunar?'float gray=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(vec3(gray*1.16),diffuseColor.rgb,.035);':''}
   #endif`);
  // Expand the stock chunks before replacing only their sampling expressions;
  // Three's normal scale/TBN and roughness channel conventions remain intact.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv )',lunar?'terrainSample( normalMap, vNormalMapUv )':'terrainSandDetail( normalMap, vNormalMapUv )'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )','terrainSample( roughnessMap, vRoughnessMapUv )'));
 };
 material.customProgramCacheKey=()=>`scanned-terrain-v5-delit-${lunar}`;
}

export function createWorld(lunar,loader,anisotropy,preparedMeshes){
 const group=new T.Group(),prefix=lunar?'lunar':'desert';
 const load=(suffix,color)=>{const t=loader.load(new URL(`./${prefix}-${suffix}.jpg`,import.meta.url).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=anisotropy;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
 const material=new T.MeshStandardMaterial({map:load('albedo',true),normalMap:load('normal'),roughnessMap:load('roughness'),color:lunar?'#d0d0cd':'#fffaf0',vertexColors:false,roughness:1,normalScale:new T.Vector2(lunar?.30:.24,lunar?.30:.24)});
 material.color.multiplyScalar(.955);scannedSurface(material,lunar);
 preparedMeshes??=buildTerrainMeshes(lunar);
 const grounds=[];
 if(preparedMeshes){
  for(const data of preparedMeshes){
   const geometry=new T.BufferGeometry();for(const [key,a] of Object.entries(data.attributes))geometry.setAttribute(key,new T.BufferAttribute(a.array,a.itemSize));geometry.setIndex(new T.BufferAttribute(data.index,1));geometry.computeBoundingSphere();
   const m=data.terrain?material:new T.MeshStandardMaterial({color:lunar?'#777774':'#bca483',roughness:1,side:T.DoubleSide});
   const mesh=new T.Mesh(geometry,m);mesh.receiveShadow=true;mesh.userData.terrain=data.terrain;group.add(mesh);if(data.terrain)grounds.push(mesh);
  }
  group.userData.grounds=grounds;group.userData.extent=1024;group.userData.lunar=lunar;group.userData.geometryBytes=group.children.reduce((sum,m)=>sum+Object.values(m.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+m.geometry.index.array.byteLength,0);
  return group;
 }

}
