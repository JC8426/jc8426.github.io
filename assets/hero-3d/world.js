import * as T from 'three';

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
   vec3 terrainWeights(vec2 uv) {
    vec3 w = .5 + .5 * sin(vec3(dot(uv, vec2(.41,.27)), dot(uv, vec2(-.31,.38)), dot(uv, vec2(.24,-.43))) + vec3(0.,2.1,4.2));
    w = pow(w + .12, vec3(4.)); return w / (w.x+w.y+w.z);
   }
   vec4 terrainSample(sampler2D tex, vec2 uv) {
    vec3 w = terrainWeights(uv);
    return texture2D(tex,uv)*w.x + texture2D(tex,uv+vec2(.371,.619))*w.y + texture2D(tex,uv+vec2(.713,.237))*w.z;
   }
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
   vec4 sampledDiffuseColor = terrainSample(map, vMapUv);
   diffuseColor *= sampledDiffuseColor;
   ${lunar?'float gray=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb=mix(vec3(gray*1.30),diffuseColor.rgb,.035);':''}
   #endif`);
  // Expand the stock chunks before replacing only their sampling expressions;
  // Three's normal scale/TBN and roughness channel conventions remain intact.
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv )','terrainSample( normalMap, vNormalMapUv )'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',T.ShaderChunk.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )','terrainSample( roughnessMap, vRoughnessMapUv )'));
 };
 material.customProgramCacheKey=()=>`scanned-terrain-v4-${lunar}`;
}

export function createWorld(lunar,loader,anisotropy){
 const group=new T.Group(),prefix=lunar?'lunar':'desert';
 const load=(suffix,color)=>{const t=loader.load(new URL(`./${prefix}-${suffix}.jpg`,import.meta.url).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=anisotropy;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
 const material=new T.MeshStandardMaterial({map:load('albedo',true),normalMap:load('normal'),roughnessMap:load('roughness'),color:lunar?'#bdbdbb':'#fff0d5',vertexColors:true,roughness:1,normalScale:new T.Vector2(lunar?.32:.46,lunar?.32:.46)});
 scannedSurface(material,lunar);
 const grounds=[];
 // 0.5 m grid across the complete 256 m patrol area; 2 m midground and 4 m
 // horizon grids. Rings omit their inner faces, avoiding depth-fighting.
 for(const [size,segments,hole] of [[256,512,0],[512,256,128],[1024,256,256]]){
  const geo=new T.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,uv=geo.attributes.uv,colors=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,groundHeight(x,z,lunar));uv.setXY(i,x/(lunar?7:2.8),z/(lunar?7:2.8));
   const a=.87+fbm(x*.013,z*.013)*.13;colors.set([a,a,a],i*3);
  }
  if(hole){const keep=[],indices=geo.index.array;for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2],x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3,z=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3;if(Math.abs(x)>=hole||Math.abs(z)>=hole)keep.push(a,b,c);}geo.setIndex(keep);}
  geo.setAttribute('color',new T.BufferAttribute(colors,3));geo.computeVertexNormals();
  // Identical analytical edge normals prevent a lighting seam between LODs.
  const normals=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),z=pos.getZ(i);
   if(Math.abs(Math.abs(x)-size/2)<.01||Math.abs(Math.abs(z)-size/2)<.01||hole&&(Math.abs(Math.abs(x)-hole)<.01||Math.abs(Math.abs(z)-hole)<.01)){
    const dx=(groundHeight(x+.2,z,lunar)-groundHeight(x-.2,z,lunar))/.4,dz=(groundHeight(x,z+.2,lunar)-groundHeight(x,z-.2,lunar))/.4;
    const norm=Math.hypot(dx,1,dz);normals.setXYZ(i,-dx/norm,1/norm,-dz/norm);
   }
  }
  const terrain=new T.Mesh(geo,material);terrain.receiveShadow=true;terrain.castShadow=!hole;terrain.userData.terrain=true;group.add(terrain);grounds.push(terrain);
  // A shallow skirt hides sub-pixel T-junction cracks at ring boundaries.
  if(!hole||size===512){
   const vertices=[],indices=[],half=size/2;
   for(let edge=0;edge<4;edge++)for(let n=0;n<=segments;n++){
    const t=-half+size*n/segments,x=edge===0?t:edge===1?half:edge===2?-t:-half,z=edge===0?-half:edge===1?t:edge===2?half:-t,y=groundHeight(x,z,lunar);
    const j=vertices.length/3;vertices.push(x,y,z,x,y-.9,z);if(n<segments)indices.push(j,j+2,j+1,j+2,j+3,j+1);
   }
   const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(vertices,3));skirt.setIndex(indices);skirt.computeVertexNormals();
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
