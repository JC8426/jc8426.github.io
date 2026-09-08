import * as T from 'three';
import {mergeVertices} from '../vendor/three/BufferGeometryUtils.js';
export const WORLD_LIMIT=90;
function hash(x,z){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);}
const smooth=t=>t*t*(3-2*t);
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),fx),T.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz);}
function fbm(x,z){let v=0,a=.5;for(let i=0;i<4;i++){v+=a*noise(x,z);a*=.5;x=x*2.03+7;z=z*2.01-9;}return v;}
const craters=[{x:-19,z:-17,r:10},{x:18,z:-25,r:8},{x:-29,z:12,r:6},...Array.from({length:28},(_,i)=>({x:(hash(i,2)-.5)*200,z:(hash(i,8)-.5)*200,r:3.8+hash(i,4)*10}))];
export function groundHeight(x,z,lunar){
 if(!lunar){const phase=(x*.82+z*.36)*.049+fbm(x*.012,z*.012)*1.5;return Math.sin(phase)*2.9+Math.sin(phase*2+.65)*.62+Math.cos(z*.021-x*.013)*1.15+(fbm(x*.22,z*.22)-.45)*.065;}
 const far=smooth(T.MathUtils.clamp((Math.hypot(x,z)-45)/80,0,1));
 let h=far*(4+fbm(x*.012,z*.012)*13)+(fbm(x*.022,z*.022)-.45)*2.2+(fbm(x*.55,z*.55)-.4)*.05;
 for(const c of craters){const q=Math.hypot(x-c.x,z-c.z)/c.r;if(q<2){const bowl=q<1?-.19*c.r*(1-q*q)**2:0;const rim=.042*c.r*Math.exp(-(((q-1)/.28)**2));h+=bowl+rim;}}
 return h;
}
export function createWorld(lunar,loader,anisotropy){
 const group=new T.Group(),prefix=lunar?'lunar':'desert';
 const load=(suffix,color)=>{const t=loader.load(new URL(`./${prefix}-${suffix}.jpg`,import.meta.url).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(32,32);t.anisotropy=anisotropy;if(color)t.colorSpace=T.SRGBColorSpace;return t;};
 const textures={map:load('albedo',true),normalMap:load('normal'),roughnessMap:load('roughness')};
 const material=new T.MeshStandardMaterial({...textures,color:lunar?'#d4d2cb':'#ead3b2',vertexColors:true,roughness:1,normalScale:new T.Vector2(.40,.40)});
 if(lunar)material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat gray = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)); diffuseColor.rgb = mix(vec3(min(gray*1.7,.7)), diffuseColor.rgb, .06);');};
 // Dense near terrain and a lower-detail outer ring, sharing world-space UVs.
 // Inner edge is +/-64; the outer grid has vertices on exactly that boundary.
 const grounds=[];
 for(const [size,segments,outer] of [[128,320,false],[256,128,true]]){
  const geo=new T.PlaneGeometry(size,size,segments,segments);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,uv=geo.attributes.uv,colors=[];
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,groundHeight(x,z,lunar));uv.setXY(i,(x+128)/256,(z+128)/256);const a=.78+fbm(x*.04,z*.04)*.20;colors.push(a,a,a);}
  if(outer){const keep=[],indices=geo.index.array;for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],x=ids.reduce((s,j)=>s+pos.getX(j),0)/3,z=ids.reduce((s,j)=>s+pos.getZ(j),0)/3;if(Math.abs(x)>=64||Math.abs(z)>=64)keep.push(...ids);}geo.setIndex(keep);}
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const terrain=new T.Mesh(geo,material);terrain.receiveShadow=true;terrain.userData.terrain=true;group.add(terrain);grounds.push(terrain);
 }
 group.userData.grounds=grounds;
 // Low, embedded chips in irregular patches. Large uniformly scattered
 // boulders have been removed; photographic detail does most of the work.
 for(let type=0;type<3;type++){
  const geo=mergeVertices(new T.IcosahedronGeometry(1,1)),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.72+fbm(x*3+type*8,z*3+y*3)*.42;p.setXYZ(i,x*k,y*k,z*k);}
  const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/32,uv.getY(i)/32);geo.computeVertexNormals();
  const m=new T.MeshStandardMaterial({...textures,color:lunar?'#c0bdb7':'#d2b993',roughness:1,normalScale:new T.Vector2(.24,.24)});if(lunar)m.onBeforeCompile=material.onBeforeCompile;
  const count=lunar?540:220,inst=new T.InstancedMesh(geo,m,count),o=new T.Object3D();inst.castShadow=true;inst.receiveShadow=true;
  for(let i=0;i<count;i++){const n=i+type*773,patch=n%23,px=(hash(patch,67)-.5)*190,pz=(hash(patch,72)-.5)*190,a=hash(n,13)*Math.PI*2,r=Math.sqrt(hash(n,41))*7;const x=px+Math.cos(a)*r,z=pz+Math.sin(a)*r,scale=.02+hash(n,34)**3*(lunar?.24:.17);o.position.set(x,groundHeight(x,z,lunar)-scale*.07,z);o.rotation.set(hash(n,23)*.5,hash(n,7)*6,hash(n,18)*.4);o.scale.set(scale*1.35,scale*.30,scale);o.updateMatrix();inst.setMatrixAt(i,o.matrix);}
  group.add(inst);
 }
 return group;
}
