import * as T from '../vendor/three/three.module.js';

// The patrol occupies the detailed centre; distant terrain provides a horizon.
export const WORLD_LIMIT=240;
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function hash(x,z){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),fx),T.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz);}
function fbm(x,z){let v=0,a=.5;for(let i=0;i<4;i++){v+=a*noise(x,z);a*=.5;x=x*2.03+7;z=z*2.01-9;}return v;}
const craters=[
 {x:-25,z:-24,r:15,age:.75},{x:30,z:-37,r:12,age:.45},{x:-43,z:21,r:8,age:.6},
 ...Array.from({length:68},(_,i)=>({x:(hash(i,2)-.5)*970,z:(hash(i,8)-.5)*970,r:7+hash(i,4)**2*48,age:hash(i,6)})),
 ...Array.from({length:14},(_,i)=>({x:(hash(i,12)-.5)*240,z:(hash(i,18)-.5)*240,r:2.4+hash(i,14)*5,age:hash(i,16)})),
];
// Near ridges frame the patrol; high, distant dune chains shape the horizon.
const desertRidges=[
 {u:25,v:-90,height:10,width:26,length:72,phase:.4},
 {u:-18,v:94,height:9,width:25,length:65,phase:2.4},
 {u:-88,v:-12,height:25,width:31,length:190,phase:1.3},
 {u:-198,v:-75,height:48,width:46,length:260,phase:.1},
 {u:-325,v:150,height:59,width:48,length:310,phase:2.6},
 {u:145,v:65,height:36,width:38,length:255,phase:3.2},
 {u:300,v:-85,height:58,width:52,length:310,phase:1.6},
];
export function groundHeight(x,z,lunar){
 if(!lunar){
  // Broad asymmetric dune ridges provide real silhouettes and slip faces.
  // Their crests meander and taper rather than repeating as a sine-wave sheet.
  const u=z+x*.16,v=x-z*.16;
  let h=(fbm(x*.013,z*.013)-.45)*2.2;
  for(const d of desertRidges){
   const along=(v-d.v)/d.length;
   if(Math.abs(along)>2.8)continue;
   const crest=d.u+Math.sin(v*.013+d.phase)*12+Math.sin(v*.029+d.phase)*3;
   const cross=u-crest;
   const width=d.width*1.5*(1+.22*Math.tanh(cross/14));
   h+=d.height*Math.exp(-((cross/width)**2))*Math.exp(-(along**4)*.7);
  }
  return h+(fbm(x*.045,z*.045)-.45)*.13;
 }
 let h=(fbm(x*.007,z*.007)-.45)*8+(fbm(x*.035,z*.035)-.45)*.48;
 for(const c of craters){
  const dx=x-c.x,dz=z-c.z;if(Math.abs(dx)>c.r*1.8||Math.abs(dz)>c.r*1.8)continue;
  const angle=Math.atan2(dz,dx),radius=c.r*(1+.025*Math.sin(angle*3+c.x)+.014*Math.cos(angle*7+c.z));
  const q=Math.hypot(dx,dz)/radius;if(q>=1.8)continue;
  const bowl=q<1?-.16*c.r*(1-q*q)**2:0;
  const rim=.028*c.r*(1-c.age*.35)*Math.exp(-(((q-.98)/(.20+c.age*.12))**2));
  // Smoothly taper ejecta to zero: overlapping craters never introduce a step.
  const taper=1-smooth(T.MathUtils.clamp((q-1.35)/.45,0,1));
  h+=(bowl+rim)*taper;
 }
 return h;
}

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
 const material=new T.MeshStandardMaterial({map:load('albedo',true),normalMap:load('normal'),roughnessMap:load('roughness'),color:lunar?'#d0d0cd':'#fffaf0',vertexColors:true,roughness:1,normalScale:new T.Vector2(lunar?.30:.24,lunar?.30:.24)});
 scannedSurface(material,lunar);
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

 // Mesh rings retain only referenced vertices. The former full outer grids
 // kept all vertices underneath the holes, wasting CPU and GPU memory.
 // 0.667 m centre / 2 m middle / 4 m horizon: fine scanned relief belongs in
 // the normal map, not a huge uniformly tessellated mesh.
 for(const [size,segments,hole] of [[256,384,0],[512,256,128],[1024,256,256]]){
  const half=size/2,step=size/segments;
  // These square holes align exactly to grid cells. Exclude their interior
  // vertices up front, so every transferred buffer has its final exact size.
  const holeCells=hole?Math.round(2*hole/step):0;
  const vertexCapacity=(segments+1)**2-(holeCells?((holeCells-1)**2):0);
  const vertices=new Float32Array(vertexCapacity*3),normals=new Float32Array(vertexCapacity*3);
  const uvs=new Float32Array(vertexCapacity*2),colors=new Float32Array(vertexCapacity*3);
  const IndexArray=vertexCapacity>65535?Uint32Array:Uint16Array;
  const indices=new IndexArray((segments**2-holeCells**2)*6);
  const vertexIds=new Int32Array((segments+1)**2);vertexIds.fill(-1);
  let vertexCount=0,indexCount=0;
  const addVertex=(ix,iz)=>{
   const key=iz*(segments+1)+ix;
   if(vertexIds[key]!==-1)return vertexIds[key];
   const x=-half+ix*step,z=-half+iz*step,id=vertexCount++;
   const y=groundHeight(x,z,lunar);
   vertices[id*3]=x;vertices[id*3+1]=y;vertices[id*3+2]=z;
   uvs[id*2]=x/(lunar?7:2.8);uvs[id*2+1]=z/(lunar?7:2.8);
   // A fixed derivative footprint across *all* vertices and LODs eliminates
   // triangulation-dependent normals and discontinuities at ring boundaries.
   const e=.35,dx=(groundHeight(x+e,z,lunar)-groundHeight(x-e,z,lunar))/(2*e);
   const dz=(groundHeight(x,z+e,lunar)-groundHeight(x,z-e,lunar))/(2*e),length=Math.hypot(dx,1,dz);
   normals[id*3]=-dx/length;normals[id*3+1]=1/length;normals[id*3+2]=-dz/length;
   const shade=.91+fbm(x*.013,z*.013)*.09;colors[id*3]=shade;colors[id*3+1]=shade;colors[id*3+2]=shade;
   vertexIds[key]=id;return id;
  };
  for(let iz=0;iz<segments;iz++)for(let ix=0;ix<segments;ix++){
   const x=-half+(ix+.5)*step,z=-half+(iz+.5)*step;
   if(hole&&Math.abs(x)<hole&&Math.abs(z)<hole)continue;
   const a=addVertex(ix,iz),b=addVertex(ix+1,iz),c=addVertex(ix,iz+1),d=addVertex(ix+1,iz+1);
   indices[indexCount++]=a;indices[indexCount++]=c;indices[indexCount++]=b;
   indices[indexCount++]=b;indices[indexCount++]=c;indices[indexCount++]=d;
  }
  if(vertexCount!==vertexCapacity||indexCount!==indices.length)throw new Error('Terrain grid capacity mismatch');
  const geo=new T.BufferGeometry();
  // BufferAttribute uses the arrays directly; Float32BufferAttribute would
  // copy them and briefly double the construction payload.
  geo.setAttribute('position',new T.BufferAttribute(vertices,3));
  geo.setAttribute('normal',new T.BufferAttribute(normals,3));
  geo.setAttribute('uv',new T.BufferAttribute(uvs,2));
  geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.setIndex(new T.BufferAttribute(indices,1));
  geo.computeBoundingSphere();
  const terrain=new T.Mesh(geo,material);terrain.receiveShadow=true;
  // A single sun shadow map is focused on the aircraft. Terrain self-shadow
  // at this grazing angle produces triangle-sized acne; relief is lit by its
  // continuous normals while aircraft continue to cast genuine ground shadows.
  terrain.castShadow=false;terrain.userData.terrain=true;group.add(terrain);grounds.push(terrain);
  if(!hole||size===512){
   const skirtVertices=new Float32Array(4*(segments+1)*6),skirtIndices=new Uint16Array(4*segments*6);
   let skirtVertex=0,skirtIndex=0;
   for(let edge=0;edge<4;edge++)for(let n=0;n<=segments;n++){
    const t=-half+size*n/segments,x=edge===0?t:edge===1?half:edge===2?-t:-half,z=edge===0?-half:edge===1?t:edge===2?half:-t,y=groundHeight(x,z,lunar);
    const j=skirtVertex/3;
    skirtVertices[skirtVertex++]=x;skirtVertices[skirtVertex++]=y;skirtVertices[skirtVertex++]=z;
    skirtVertices[skirtVertex++]=x;skirtVertices[skirtVertex++]=y-.9;skirtVertices[skirtVertex++]=z;
    if(n<segments){skirtIndices[skirtIndex++]=j;skirtIndices[skirtIndex++]=j+2;skirtIndices[skirtIndex++]=j+1;skirtIndices[skirtIndex++]=j+2;skirtIndices[skirtIndex++]=j+3;skirtIndices[skirtIndex++]=j+1;}
   }
   const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.BufferAttribute(skirtVertices,3));skirt.setIndex(new T.BufferAttribute(skirtIndices,1));skirt.computeVertexNormals();
   const skirtMaterial=new T.MeshStandardMaterial({color:lunar?'#777774':'#bca483',roughness:1,side:T.DoubleSide});
   const mesh=new T.Mesh(skirt,skirtMaterial);mesh.receiveShadow=true;group.add(mesh);
  }
 }
 group.userData.grounds=grounds;
 group.userData.extent=1024;
 group.userData.geometryBytes=group.children.reduce((sum,mesh)=>sum+Object.values(mesh.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0)+(mesh.geometry.index?.array.byteLength||0),0);
 // No floating or instanced pebbles: surface detail comes from the scans.
 return group;
}
