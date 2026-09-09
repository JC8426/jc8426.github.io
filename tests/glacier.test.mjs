import test from 'node:test';
import assert from 'node:assert/strict';
import {createGlacierWorld,glacierHeight,updateGlacier} from '../assets/hero-3d/glacier.js';
import {disposeGraph} from '../assets/hero-3d/resources.mjs';
import {PATROL_POINTS,FORMATION_SLOTS} from '../assets/hero-3d/flight-state.mjs';
test('glacial route has an open water corridor and finite compact geometry',()=>{
 for(const [x,z] of PATROL_POINTS)for(const [dx,dz] of FORMATION_SLOTS)assert.equal(glacierHeight(x+dx,z+dz),0);
 const g=createGlacierWorld();assert.equal(g.userData.environment,'glacier');assert.ok(g.userData.geometryBytes<2*1048576);assert.ok(g.userData.textureBytes<1048576);assert.ok(g.userData.reflectionBytes<=3*1048576);
 assert.equal(g.userData.grounds.length,45);
 for(const mesh of g.children){for(const a of Object.values(mesh.geometry.attributes))assert.ok(a.array.every(Number.isFinite));assert.ok(mesh.geometry.index.array.every(i=>i<mesh.geometry.attributes.position.count));}
 updateGlacier(g,10);assert.equal(g.userData.water.material.uniforms.time.value,2);disposeGraph(g);assert.equal(g.children.length,0);assert.equal(g.userData.dispose,undefined);
});
