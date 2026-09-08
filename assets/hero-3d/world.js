import * as T from 'three';
import {mergeVertices} from '../vendor/three/BufferGeometryUtils.js';
export const WORLD_LIMIT=90;
function hash(x,z){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);}
const smooth=t=>t*t*(3-2*t);
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),fx),T.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz);}
function fbm(x,z){let v=0,a=.5;for(let i=0;i<4;i++){v+=a*noise(x,z);a*=.5;x=x*2.03+7;z=z*2.01-9;}return v;}
const craters=Array.from({length:45},(_,i)=>({x:(hash(i,2)-.5)*235,z:(hash(i,8)-.5)*235,r:1.5+hash(i,4)*10}));
export function groundHeight(x,z,lunar){
 if(!lunar){const warp=fbm(x*.014,z*.014)*18;return (Math.sin((x+warp)*.046+z*.026)*2.7+Math.sin(z*.064-x*.02)*1.8)*Math.min(1,Math.hypot(x,z)/22)+fbm(x*.14,z*.14)*.23;}
 let h=(fbm(x*.033,z*.033)-.45)*4+(fbm(x*.7,z*.7)-.4)*.13;
 for(const c of craters){const q=Math.hypot(x-c.x,z-c.z)/c.r;if(q<1.6)h+=c.r*(-.24*Math.exp(-q*q*3)+.07*Math.exp(-(((q-1)/.17)**2)));}
 return h;
}
export function createWorld(lunar,loader,anisotropy){
 const group=new T.Group();const prefix=lunar?'lunar':'desert';
 const load=(suffix,color)=>{const t=loader.load(new URL(`./${prefix}-${suffix}.jpg`,import.meta.url).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(32,32);t.anisotropy=anisotropy;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
 const textures={map:load('albedo',true),normalMap:load('normal'),roughnessMap:load('roughness')};
 const geo=new T.PlaneGeometry(260,260,240,240);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,colors=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,groundHeight(x,z,lunar));const a=.64+fbm(x*.045,z*.045)*.43;colors.push(a,a,a);}
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
 const material=new T.MeshStandardMaterial({...textures,color:lunar?'#d4d2cb':'#ead3b2',vertexColors:true,roughness:1,normalScale:new T.Vector2(.68,.68)});
 if(lunar)material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat gray = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)); diffuseColor.rgb = mix(vec3(min(gray*1.7,.7)), diffuseColor.rgb, .06);');};
 const terrain=new T.Mesh(geo,material);terrain.receiveShadow=true;group.add(terrain);
 // Several unique high-detail rock forms, batched as instances. Avoid regular
 // rows, uniform size, or the spherical boulders of the first prototype.
 for(let type=0;type<5;type++){
  const rockGeo=mergeVertices(new T.IcosahedronGeometry(1,3));const p=rockGeo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const a=.72+fbm(x*3+type*8,z*3+y*3)*.58;p.setXYZ(i,x*a,y*a,z*a);}
  rockGeo.computeVertexNormals();
  const rockMaterial=new T.MeshStandardMaterial({map:textures.map,normalMap:textures.normalMap,roughnessMap:textures.roughnessMap,color:lunar?'#767675':'#a98b67',roughness:.94,normalScale:new T.Vector2(.35,.35)});
  if(lunar)rockMaterial.onBeforeCompile=material.onBeforeCompile;
  const count=lunar?180:75;const inst=new T.InstancedMesh(rockGeo,rockMaterial,count);inst.castShadow=true;inst.receiveShadow=true;const o=new T.Object3D();
  for(let i=0;i<count;i++){const n=i+type*201,x=(hash(n,61)-.5)*220,z=(hash(n,95)-.5)*220,scale=.04+hash(n,34)**4*(lunar?1.7:.75);o.position.set(x,groundHeight(x,z,lunar)+scale*.12,z);o.rotation.set(hash(n,23)*3,hash(n,7)*6,hash(n,18));o.scale.set(scale*1.3,scale*.62,scale);o.updateMatrix();inst.setMatrixAt(i,o.matrix);}
  group.add(inst);
 }
 return group;
}
