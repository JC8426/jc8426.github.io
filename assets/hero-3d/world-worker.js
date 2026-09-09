import * as T from '../vendor/three/three.module.js';
import {createWorld,groundHeight} from './world.js';
// No DOM, image decoding or WebGL context in this short-lived worker.
self.onmessage=({data:{lunar,recycle}})=>{
 try{
  if(recycle){
   for(const m of recycle){const p=m.attributes.position.array,n=m.attributes.normal.array,uv=m.attributes.uv?.array;
    for(let i=0;i<p.length;i+=3){const x=p[i],z=p[i+2];p[i+1]=groundHeight(x,z,lunar)-(m.terrain?0:((i/3)%2)*.9);
     if(m.terrain){const e=.35,dx=(groundHeight(x+e,z,lunar)-groundHeight(x-e,z,lunar))/(2*e),dz=(groundHeight(x,z+e,lunar)-groundHeight(x,z-e,lunar))/(2*e),d=Math.hypot(dx,1,dz);n[i]=-dx/d;n[i+1]=1/d;n[i+2]=-dz/d;uv[i/3*2]=x/(lunar?7:2.8);uv[i/3*2+1]=z/(lunar?7:2.8);}
    }
   }
   self.postMessage({meshes:recycle},recycle.flatMap(m=>[...Object.values(m.attributes).map(a=>a.array.buffer),m.index.buffer]));return;
  }
  const world=createWorld(lunar,{load:()=>new T.Texture()},1);
  const meshes=world.children.map(mesh=>({terrain:!!mesh.userData.terrain,attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key,a])=>[key,{array:a.array,itemSize:a.itemSize}])),index:mesh.geometry.index.array}));
  const transfer=meshes.flatMap(m=>[...Object.values(m.attributes).map(a=>a.array.buffer),m.index.buffer]);
  self.postMessage({meshes},transfer);
 }catch(error){self.postMessage({error:String(error)});}
};
