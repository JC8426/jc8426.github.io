import * as T from 'three';
import {HDRLoader} from '../vendor/three/HDRLoader.js';
export const DESERT_SUN=new T.Vector3(.7143,.4687,.5197).normalize();
export async function createDesertEnvironment(renderer){
 const source=await new HDRLoader().loadAsync(new URL('./lighting/qwantani_puresky_1k.hdr',import.meta.url).href);
 source.mapping=T.EquirectangularReflectionMapping;
 const generator=new T.PMREMGenerator(renderer);
 try{return generator.fromEquirectangular(source);}
 finally{source.dispose();source.image=null;generator.dispose();}
}
// Moon has no blue atmospheric sky. Small neutral studio-like fill supplies
// readable metal highlights; it is an artistic exposure choice, not astronomy.
export function createLunarEnvironment(renderer){
 const scene=new T.Scene();scene.background=new T.Color('#15171b');
 const white=new T.MeshBasicMaterial({color:'#d3d3d0',side:T.DoubleSide});
 const panel=new T.Mesh(new T.PlaneGeometry(12,12),white);panel.position.set(-10,12,8);panel.lookAt(0,0,0);scene.add(panel);
 const generator=new T.PMREMGenerator(renderer);
 try{return generator.fromScene(scene,.06,.1,100,{size:128});}
 finally{panel.geometry.dispose();white.dispose();generator.dispose();}
}
