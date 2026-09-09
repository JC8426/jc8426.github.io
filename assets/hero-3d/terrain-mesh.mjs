import {groundHeight} from './world-math.mjs';
// Typed-array terrain construction; no Three.js, DOM, textures or renderer.
export function buildTerrainMeshes(lunar){
 const meshes=[];
 for(const [size,segments,hole] of [[256,384,0],[512,256,128],[1024,256,256]]){
  const half=size/2,step=size/segments;
  // These square holes align exactly to grid cells. Exclude their interior
  // vertices up front, so every transferred buffer has its final exact size.
  const holeCells=hole?Math.round(2*hole/step):0;
  const vertexCapacity=(segments+1)**2-(holeCells?((holeCells-1)**2):0);
  const vertices=new Float32Array(vertexCapacity*3),normals=new Float32Array(vertexCapacity*3);
  const uvs=new Float32Array(vertexCapacity*2);
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

  meshes.push({terrain:true,attributes:{position:{array:vertices,itemSize:3},normal:{array:normals,itemSize:3},uv:{array:uvs,itemSize:2}},index:indices});
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

   const skirtNormals=new Float32Array(skirtVertices.length),directions=[[0,0,-1],[1,0,0],[0,0,1],[-1,0,0]];
   for(let edge=0;edge<4;edge++)for(let n=0;n<=(segments*2+1);n++){const i=(edge*(segments+1)*2+n)*3;skirtNormals.set(directions[edge],i);}
   meshes.push({terrain:false,attributes:{position:{array:skirtVertices,itemSize:3},normal:{array:skirtNormals,itemSize:3}},index:skirtIndices});
  }
 }
 return meshes;
}
