import * as T from '../vendor/three/three.module.js';
import { Water } from '../vendor/three/Water.js';

// Authored procedural ice sculpture, not a photogrammetry or scanned asset.
// One lagoon replaces the sand terrain; all five aircraft share this world.
const icebergs = [
 {x:-89,z:-58,rx:31,rz:47,h:26,seed:2}, {x:86,z:-81,rx:38,rz:53,h:39,seed:7},
 {x:-157,z:-120,rx:68,rz:58,h:68,seed:11}, {x:176,z:-165,rx:75,rz:74,h:86,seed:16},
 {x:-55,z:-203,rx:77,rz:58,h:62,seed:21}, {x:58,z:-288,rx:98,rz:65,h:110,seed:25},
 {x:-246,z:-253,rx:103,rz:89,h:132,seed:30}, {x:309,z:-293,rx:110,rz:89,h:148,seed:33},
 {x:-120,z:114,rx:35,rz:33,h:15,seed:42}, {x:147,z:95,rx:39,rz:34,h:21,seed:49},
 {x:-301,z:151,rx:91,rz:111,h:80,seed:53}, {x:323,z:145,rx:90,rz:131,h:98,seed:57},
];
const edge = (a,s) => 1+.21*Math.sin(a*3+s)+.115*Math.sin(a*5+s*2)+.07*Math.cos(a*2-s);
const top = (u,v,b) => b.h*Math.max(.19,.57+.25*Math.sin(u*2.7+b.seed)+.18*Math.cos(v*2.5+b.seed*.3)+.18*(u*.6+v*.7)+.075*Math.sin(u*7+v*4));
function localIceHeight(x,z,b){
 const u=(x-b.x)/b.rx,v=(z-b.z)/b.rz,a=Math.atan2(v,u),r=Math.hypot(u,v)/edge(a,b.seed);
 if(r>1.04)return -2;
 // Flat-topped, eroded iceberg caps with a steep, explicitly modelled wall.
 return top(u,v,b)*(1-.09*r*r);
}
export function glacierHeight(x,z){
 let h=0;
 for(const b of icebergs)if(Math.abs(x-b.x)<b.rx*1.42&&Math.abs(z-b.z)<b.rz*1.42)h=Math.max(h,localIceHeight(x,z,b));
 for(const b of floes)if(Math.abs(x-b.x)<b.rx*1.42&&Math.abs(z-b.z)<b.rz*1.42)h=Math.max(h,localIceHeight(x,z,b));
 return h;
}
const rand=n=>{const v=Math.sin(n*127.17)*43758.5453;return v-Math.floor(v);};
// Ice floes cluster along the banks, leaving the figure-eight flight corridor open.
const floes=Array.from({length:32},(_,i)=>({x:(i%2?1:-1)*(63+rand(i+15)*67),z:-155+rand(i+4)*275,rx:1.2+rand(i+8)*4.2,rz:1.4+rand(i+19)*5,h:.35+rand(i+27)*1.25,seed:i+61}));

function iceGeometry(b,segments=80){
 const pos=[],colors=[],indices=[];
 const rings=[{r:0,y:1},{r:.25,y:1},{r:.5,y:1},{r:.75,y:1},{r:.93,y:1},{r:1,y:1},{r:1.015,y:.78},{r:1.025,y:.38},{r:1.035,y:0},{r:.98,y:-.13}];
 for(let j=0;j<rings.length;j++){
  const ring=rings[j];
  for(let i=0;i<segments;i++){
   const a=i/segments*Math.PI*2,e=edge(a,b.seed);
   const erosion=j>5&&j<8?1-.08*Math.max(0,Math.sin(a*7+b.seed))*(j===6?.5:1):1;
   const u=Math.cos(a)*e*ring.r*erosion,v=Math.sin(a)*e*ring.r*erosion;
   let y;
   if(j<6)y=top(u,v,b)*(1-.09*ring.r**2);
   else if(j===8)y=-.16;
   else if(j===9)y=-3;
   else y=top(u,v,b)*(1-.09)*ring.y+(Math.sin(a*13+b.seed)*.10+Math.sin(a*23)*.035)*b.h;
   pos.push(b.x+u*b.rx,y,b.z+v*b.rz);
   // Frost caps, blue compressed ice faces and dark submerged feet.
   const c=new T.Color(j<6?'#ddeef1':j<8?'#7db9cb':'#29687f');
   const shade=.96+.04*Math.sin(a*9+b.seed)+.015*Math.cos(a*23);
   c.multiplyScalar(shade);colors.push(c.r,c.g,c.b);
  }
 }
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
  const a=j*segments+i,b0=j*segments+(i+1)%segments,c=(j+1)*segments+i,d=(j+1)*segments+(i+1)%segments;
  indices.push(a,b0,c,b0,d,c);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function iceMaterial(){
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.03,side:T.DoubleSide});
 material.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 icePosition;');
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nicePosition=(modelMatrix*vec4(position,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 icePosition;
   float iceHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float iceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(iceHash(i),iceHash(i+vec3(1,0,0)),f.x),mix(iceHash(i+vec3(0,1,0)),iceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(iceHash(i+vec3(0,0,1)),iceHash(i+vec3(1,0,1)),f.x),mix(iceHash(i+vec3(0,1,1)),iceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `);
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float n=iceNoise(icePosition*.31);
   float vein=pow(1.-abs(2.*iceNoise(icePosition*vec3(.65,.09,.65)+n*.8)-1.),14.);
   float band=sin(icePosition.y*.43+n*1.5)*.5+.5;
   diffuseColor.rgb*=.90+.10*n;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.64,.88,.97),vein*.18+band*.025);
  `);
  // Small analytic perturbation is continuous in world space, without tiled imagery.
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float detail=iceNoise(icePosition*3.1)*.025;
   vec3 q0=dFdx(-vViewPosition),q1=dFdy(-vViewPosition);
   vec3 r1=cross(q1,normal),r2=cross(normal,q0);
   float determinant=dot(q0,r1);
   vec3 surfGradient=sign(determinant)*(r1*dFdx(detail)+r2*dFdy(detail));
   normal=normalize(abs(determinant)*normal-surfGradient*.18);
  `);
 };material.customProgramCacheKey=()=> 'glacier-ice-v1';return material;
}
function lagoonNormals(){
 const size=256,data=new Uint8Array(size*size*4);
 // Periodic Fourier waves make a seamless original tangent-space normal map.
 const waves=[[3,1,.024,.3],[2,-5,.012,1.1],[7,4,.009,2.7],[13,-9,.004,.9]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let dx=0,dy=0;
  for(const [kx,ky,amplitude,phase] of waves){const c=Math.cos((x*kx+y*ky)/size*Math.PI*2+phase);dx+=amplitude*kx*c;dy+=amplitude*ky*c;}
  const n=new T.Vector3(-dx,-dy,1).normalize(),i=(y*size+x)*4;
  data[i]=Math.round((n.x*.5+.5)*255);data[i+1]=Math.round((n.y*.5+.5)*255);data[i+2]=Math.round((n.z*.5+.5)*255);data[i+3]=255;
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function createGlacierWorld(){
 const group=new T.Group();group.name='Glacial lagoon';
 const normals=lagoonNormals();
 const water=new Water(new T.PlaneGeometry(1024,1024,1,1),{textureWidth:512,textureHeight:512,waterNormals:normals,sunDirection:new T.Vector3(.7143,.4687,.5197).normalize(),sunColor:0xe3edf1,waterColor:0x0a3446,distortionScale:.65,fog:true});
 water.material.fragmentShader=water.material.fragmentShader.replace('float rf0 = 0.3;', 'float rf0 = 0.025;').replace('vec3( 0.1 ) + reflectionSample', 'vec3( 0.015 ) + reflectionSample');
 // Broad, differently oriented samples avoid the old repeated crosshatch.
 const shader=water.material.fragmentShader;
 const start=shader.indexOf('vec4 getNoise( vec2 uv ) {');
 const end=shader.indexOf('void sunLight(',start);
 if(start<0||end<0)throw new Error('Water shader noise hook changed');
 water.material.fragmentShader=shader.slice(0,start)+`
 vec4 getNoise(vec2 uv) {
  vec2 drift=vec2(time*.006,time*.004);
  vec2 warp=vec2(sin(uv.y*.013+time*.04),cos(uv.x*.017-time*.03))*1.8;
  vec2 p=uv+warp;
  vec4 a=texture2D(normalSampler,p/137.+drift);
  vec4 b=texture2D(normalSampler,mat2(.8,-.6,.6,.8)*p/211.-drift*.73);
  vec4 c=texture2D(normalSampler,mat2(.28,.96,-.96,.28)*p/89.+drift*.41);
  return (a*.46+b*.34+c*.20)*2.-1.;
 }
 `+shader.slice(end);
 water.material.fragmentShader=water.material.fragmentShader
  .replace('vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
   'float rippleFade = mix(1.0, 0.28, smoothstep(35.0, 200.0, length(eye-worldPosition.xyz)));\n vec3 surfaceNormal = normalize(vec3(noise.x * .55 * rippleFade, max(noise.z, .5), noise.y * .55 * rippleFade));')
  .replace('100.0, 2.0, 0.5, diffuseLight', '45.0, 0.65, 0.5, diffuseLight');
 water.material.uniforms.size.value=2;water.rotation.x=-Math.PI/2;water.receiveShadow=true;water.name='Lagoon water';group.add(water);
 const material=iceMaterial(),grounds=[water];
 for(const b of [...icebergs,...floes]){const mesh=new T.Mesh(iceGeometry(b,b.h>3?80:28),material);mesh.castShadow=b.h<45;mesh.receiveShadow=true;mesh.name=b.h>3?'Sculpted iceberg':'Floating ice';group.add(mesh);grounds.push(mesh);}
 let geometryBytes=0;
 group.traverse(o=>{if(o.geometry){for(const a of Object.values(o.geometry.attributes))geometryBytes+=a.array.byteLength;geometryBytes+=o.geometry.index?.array.byteLength||0;}});
 Object.assign(group.userData,{grounds,extent:1024,lunar:false,environment:'glacier',geometryBytes,textureBytes:Math.ceil(256*256*4*4/3),reflectionBytes:512*512*8,water,dispose:()=>{water.disposeReflection();normals.dispose();},assetProvenance:'Authored procedural glacier geometry; no scanned-asset claim.'});
 return group;
}
export function updateGlacier(group,time){if(group?.userData.water)group.userData.water.material.uniforms.time.value=time*.20;}
