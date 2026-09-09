import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainSeparation } from '../assets/hero-3d/separation.mjs';
const p = (x, z = 0, y = 5) => ({ x, y, z });
const near = (a,b,eps=1e-6) => assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);

test('rigid swarm translation passes unchanged without input mutation', () => {
 const before=[p(-5),p(0),p(5)], after=before.map(q=>({...q,x:q.x+0.6,z:2}));
 const saved=JSON.stringify([before,after]);
 const r=constrainSeparation(before,after);
 assert.deepEqual(r.positions,after);assert.equal(r.intervened,false);
 assert.equal(JSON.stringify([before,after]),saved);near(r.minDistance,5);
});
test('opposing aircraft cannot tunnel even when safe endpoints exchange places',()=>{
 const r=constrainSeparation([p(-5),p(5)],[p(5),p(-5)]);
 assert.ok(r.fraction<.31);assert.ok(r.sweptMinDistance>=3.8);
 assert.ok(r.positions[0].x<r.positions[1].x);
});
test('crossing paths are checked at matching times, not only endpoints',()=>{
 const r=constrainSeparation([p(-5),p(0,-5)],[p(5),p(0,5)]);
 assert.ok(r.intervened);assert.ok(r.sweptMinDistance>=3.8);
});
test('unselected neighbours remain protected and all displacements are bounded',()=>{
 const before=[p(-4),p(0),p(6),p(12),p(18)],after=[p(-3.4),p(0),p(6.6),p(12.6),p(18.6)];
 const r=constrainSeparation(before,after);
 assert.ok(r.intervened);assert.ok(r.minDistance>=3.8);
 r.positions.forEach((q,i)=>assert.ok(Math.hypot(q.x-before[i].x,q.z-before[i].z)<=Math.hypot(after[i].x-before[i].x,after[i].z-before[i].z)+1e-9));
});
test('contact can slide or retreat rather than remaining permanently stuck',()=>{
 assert.equal(constrainSeparation([p(0),p(3.8)],[p(-.6),p(4.4)]).fraction,1);
 assert.equal(constrainSeparation([p(0),p(3.8)],[p(0,1),p(3.8)]).fraction,1);
 assert.equal(constrainSeparation([p(0),p(3.8)],[p(.1),p(3.8)]).fraction,0);
});
test('existing overlaps allow gradual escape but never forced teleportation',()=>{
 const before=[p(0),p(2)];
 const escaping=constrainSeparation(before,[p(-.1),p(2.1)]);
 assert.deepEqual(escaping.initialOverlaps,[[0,1]]);near(escaping.minDistance,2.2);assert.equal(escaping.fraction,1);
 const worsening=constrainSeparation(before,[p(.1),p(1.9)]);
 assert.equal(worsening.fraction,0);assert.deepEqual(worsening.positions,before);
});
test('coincident starts can separate and altitude does not bypass guard',()=>{
 assert.equal(constrainSeparation([p(0),p(0)],[p(-.1),p(.1)]).fraction,1);
 const r=constrainSeparation([p(-3,0,1),p(3,0,20)],[p(3,0,1),p(-3,0,20)]);
 assert.ok(r.sweptMinDistance>=3.8);assert.ok(r.intervened);
});
test('map bounds are enforced without moving farther than the proposal',()=>{
 const r=constrainSeparation([p(9)],[p(15)],{limit:10});
 assert.deepEqual(r.positions,[p(10)]);assert.ok(r.boundaryLimited);
 assert.throws(()=>constrainSeparation([p(11)],[p(15)],{limit:10}),RangeError);
});
test('long repeated opposing movement holds separation without accumulating penetration',()=>{
 let positions=[p(-10),p(10)];
 for(let n=0;n<600;n++){
  const r=constrainSeparation(positions,[p(positions[0].x+.6),p(positions[1].x-.6)]);
  assert.ok(r.sweptMinDistance>=3.8-1e-8);positions=r.positions;
 }
 near(positions[1].x-positions[0].x,3.8);
});
test('invalid shape and nonfinite data fail explicitly',()=>{
 assert.throws(()=>constrainSeparation([p(0)],[]),RangeError);
 assert.throws(()=>constrainSeparation([p(0)],[p(NaN)]),TypeError);
});
test('deterministic stress cases preserve clearance throughout accepted sweeps',()=>{
 let seed=8426;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let trial=0;trial<300;trial++){
  const before=Array.from({length:5},(_,i)=>p(i*5,(random()-.5)*2));
  const proposed=before.map(q=>p(q.x+(random()-.5)*30,q.z+(random()-.5)*30));
  const r=constrainSeparation(before,proposed);
  for(let t=0;t<=20;t++){
   const points=r.positions.map((q,i)=>p(before[i].x+(q.x-before[i].x)*t/20,before[i].z+(q.z-before[i].z)*t/20));
   for(let i=0;i<5;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z)>=3.8-1e-8);
  }
 }
});
test('actual rotor-envelope guard holds 4.4 m at the new 3x speed limit',()=>{
 let positions=[p(-4),p(4)];for(let i=0;i<60;i++){
  const r=constrainSeparation(positions,[p(positions[0].x+.6),p(positions[1].x-.6)],{clearance:4.4,limit:240});
  assert.ok(r.sweptMinDistance>=4.4-1e-8);positions=r.positions;
 }
});
