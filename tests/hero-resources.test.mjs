import test from 'node:test';
import assert from 'node:assert/strict';
import {disposeGraph,textureBytes,waypointFrame} from '../assets/hero-3d/resources.mjs';
import * as T from '../assets/vendor/three/three.module.js';
import {createWorld} from '../assets/hero-3d/world.js';

test('owned graph cleanup disposes shared objects once and closes decoded image buffers',()=>{
 const calls={geometry:0,texture:0,material:0,image:0};
 const geometry={dispose:()=>calls.geometry++},texture={isTexture:true,dispose:()=>calls.texture++,image:{close:()=>calls.image++}},material={map:texture,normalMap:texture,dispose:()=>calls.material++};
 disposeGraph({traverse:fn=>{fn({geometry,material});fn({geometry,material:[material]});}});
 assert.deepEqual(calls,{geometry:1,texture:1,material:1,image:1});
});
test('compressed texture budget uses uploaded blocks, not uncompressed RGBA assumptions',()=>{
 assert.equal(textureBytes({isCompressedTexture:true,mipmaps:[{data:new Uint8Array(1024)},{data:new Uint8Array(256)}]}),1280);
 assert.equal(textureBytes({image:{width:256,height:256},generateMipmaps:true}),256*256*4*4/3);
});
test('waypoint selection camera is elevated and expands to include remote targets',()=>{
 const near=waypointFrame({x:0,z:0},null,16/9),far=waypointFrame({x:0,z:0},{x:180,z:-100},16/9),phone=waypointFrame({x:0,z:0},null,390/844);
 assert.ok(near.height>=35);assert.ok(far.height>near.height);assert.ok(phone.height>near.height);assert.deepEqual(far.target,{x:90,z:-50});
});
for(const lunar of [false,true])test(`worker geometry hydrates without duplicate buffers (${lunar?'moon':'desert'})`,()=>{
 const loader={load:()=>new T.Texture()},world=createWorld(lunar,loader,1);
 const packed=world.children.map(m=>({terrain:!!m.userData.terrain,attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,{array:a.array,itemSize:a.itemSize}])),index:m.geometry.index.array}));
 const hydrated=createWorld(lunar,loader,1,packed);let bytes=0;
 hydrated.children.forEach((mesh,i)=>{const g=mesh.geometry;assert.equal(g.attributes.position.array.buffer,packed[i].attributes.position.array.buffer);bytes+=g.index.array.byteLength;
  for(const a of Object.values(g.attributes)){bytes+=a.array.byteLength;assert.ok(a.array.every(Number.isFinite));}
  assert.ok(g.index.array.every(i=>i<g.attributes.position.count));
 });
 assert.equal(hydrated.userData.grounds.length,3);assert.ok(bytes<17*1048576);disposeGraph(world);disposeGraph(hydrated);
});

import {readFileSync} from 'node:fs';
import {parseAstc} from '../assets/hero-3d/compressed-texture.js';
test('offline ASTC files have complete bounded mip chains and reject corrupted offsets',()=>{
 for(const theme of ['desert','lunar'])for(const channel of ['albedo','normal','roughness']){
  const b=readFileSync(new URL(`../assets/hero-3d/${theme}-${channel}-astc.ktx2`,import.meta.url)),buffer=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),texture=parseAstc(buffer);
  assert.equal(texture.mipmaps.at(-1).width,1);assert.equal(texture.mipmaps.at(-1).height,1);
  assert.ok(textureBytes(texture)<6*1048576);texture.dispose();
  new DataView(buffer).setBigUint64(80,BigInt(buffer.byteLength+1),true);
  assert.throws(()=>parseAstc(buffer),/mip range/);
 }
});
