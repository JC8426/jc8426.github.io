import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const b=readFileSync(new URL('../assets/hero-3d/drone/research-quad.glb',import.meta.url));
assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);
const jl=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+jl).toString()),binOffset=28+jl;
for(const n of ['body-near','body-far','rotor-0','rotor-1','rotor-2','rotor-3'])assert(j.nodes.some(x=>x.name===n),n);
for(const v of j.bufferViews)assert(v.byteOffset+v.byteLength<=j.buffers[0].byteLength);
for(const a of j.accessors){const v=j.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3}[a.type],bytes={5123:2,5125:4,5126:4}[a.componentType];assert(a.count*components*bytes<=v.byteLength);if(a.componentType===5126){for(let i=0;i<a.count*components;i++)assert(Number.isFinite(b.readFloatLE(binOffset+v.byteOffset+i*4)));}}
for(const m of j.meshes)for(const p of m.primitives){assert(p.attributes.POSITION!==undefined);assert(p.attributes.NORMAL!==undefined);assert(p.material<j.materials.length);const a=j.accessors[p.indices],v=j.bufferViews[a.bufferView],n=j.accessors[p.attributes.POSITION].count;for(let i=0;i<a.count;i++){const ix=a.componentType===5123?b.readUInt16LE(binOffset+v.byteOffset+i*2):b.readUInt32LE(binOffset+v.byteOffset+i*4);assert(ix<n);}}
assert(b.length<10*1024*1024);console.log(`GLB valid: ${j.meshes.length} batches, ${j.materials.length} materials, ${j.images.length} embedded textures, ${(b.length/1024/1024).toFixed(2)} MiB.`);
