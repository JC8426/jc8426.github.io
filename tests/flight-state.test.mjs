import test from 'node:test';
import assert from 'node:assert/strict';
import {manualStep,automaticPose} from '../assets/hero-3d/flight-state.mjs';
const flat=()=>0;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('forward input follows aircraft heading',()=>{
 let p=manualStep({x:0,y:4,z:0},0,{forward:1},.5,2,flat);near(p.z,1);near(p.x,0);
 p=manualStep({x:0,y:4,z:0},Math.PI/2,{forward:1},.5,2,flat);near(p.x,1);near(p.z,0);
});
test('diagonal input does not increase horizontal speed',()=>{
 const p=manualStep({x:0,y:4,z:0},0,{forward:1,side:1},.5,2,flat);near(Math.hypot(p.x,p.z),1);
});
test('descent obeys terrain clearance and ascent obeys height limit',()=>{
 near(manualStep({x:0,y:2,z:0},0,{up:-1},5,2,()=>2).y,3.25);
 near(manualStep({x:0,y:17,z:0},0,{up:1},10,2,flat).y,18);
});
test('manual flight cannot leave the world bounds',()=>{
 const p=manualStep({x:89.9,y:4,z:89.9},0,{forward:1,side:1},1,4,flat);assert.ok(p.x<=90&&p.z<=90);
});
test('five distinct formation slots remain separated over time',()=>{
 for(const t of [0,10,100,1000]){const p=Array.from({length:5},(_,i)=>automaticPose(i,t));for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(Math.hypot(p[i].x-p[j].x,p[i].z-p[j].z)>=5.6);}
});

import {SPEED_MULTIPLIER,fleetCenter,clampWaypoint,advanceWaypoint,formationTarget,FORMATION_SLOTS} from '../assets/hero-3d/flight-state.mjs';
test('base translation is exactly twice the previous speed at equal pace',()=>{
 assert.equal(SPEED_MULTIPLIER,2);const old=manualStep({x:0,y:4,z:0},0,{forward:1},1,2*.6,flat);const next=manualStep({x:0,y:4,z:0},0,{forward:1},1,2*.6*SPEED_MULTIPLIER,flat);near(next.z,old.z*2);
});
test('waypoint movement is bounded by speed and never overshoots',()=>{
 const p=advanceWaypoint({x:0,z:0},{x:3,z:4},1,2);near(Math.hypot(p.x,p.z),2);assert.equal(p.arrived,false);
 const end=advanceWaypoint(p,{x:3,z:4},10,2);near(end.x,3);near(end.z,4);assert.equal(end.arrived,true);
 const hold=advanceWaypoint(end,{x:3,z:4},10,2);near(hold.x,3);near(hold.z,4);
});
test('all five slots translate together and retain pairwise spacing',()=>{
 const a={x:4,z:-8},b=advanceWaypoint(a,{x:25,z:30},.2,2.4);
 const old=FORMATION_SLOTS.map((_,i)=>formationTarget(i,a));const next=FORMATION_SLOTS.map((_,i)=>formationTarget(i,b));
 for(let i=0;i<5;i++){near(next[i].x-old[i].x,b.x-a.x);near(next[i].z-old[i].z,b.z-a.z);}
 const center=fleetCenter(next);near(center.x,b.x);near(center.z,b.z);
});
test('waypoint clamp keeps every member inside bounds including custom offsets',()=>{
 for(const slots of [FORMATION_SLOTS,[[0,0],[-30,5],[20,-4],[-8,25],[8,-26]]])for(const goal of [{x:999,z:999},{x:-999,z:-999}]){
  const target=clampWaypoint(goal,90,slots);for(let i=0;i<5;i++){const p=formationTarget(i,target,slots);assert.ok(p.x>=-90&&p.x<=90&&p.z>=-90&&p.z<=90);}
 }
});
test('redirecting starts from the current center without resetting the fleet',()=>{
 const halfway=advanceWaypoint({x:0,z:0},{x:20,z:0},2,2);const turn=advanceWaypoint(halfway,{x:-10,z:8},.1,2);near(Math.hypot(turn.x-halfway.x,turn.z-halfway.z),.2);assert.ok(turn.x>3);
});
