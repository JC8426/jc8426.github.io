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

import {SPEED_MULTIPLIER,swarmCenter,clampWaypoint,advanceWaypoint,formationTarget,FORMATION_SLOTS} from '../assets/hero-3d/flight-state.mjs';
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
 const center=swarmCenter(next);near(center.x,b.x);near(center.z,b.z);
});
test('waypoint clamp keeps every member inside bounds including custom offsets',()=>{
 for(const slots of [FORMATION_SLOTS,[[0,0],[-30,5],[20,-4],[-8,25],[8,-26]]])for(const goal of [{x:999,z:999},{x:-999,z:-999}]){
  const target=clampWaypoint(goal,90,slots);for(let i=0;i<5;i++){const p=formationTarget(i,target,slots);assert.ok(p.x>=-90&&p.x<=90&&p.z>=-90&&p.z<=90);}
 }
});
test('redirecting starts from the current center without resetting the swarm',()=>{
 const halfway=advanceWaypoint({x:0,z:0},{x:20,z:0},2,2);const turn=advanceWaypoint(halfway,{x:-10,z:8},.1,2);near(Math.hypot(turn.x-halfway.x,turn.z-halfway.z),.2);assert.ok(turn.x>3);
});

import {flightKey,acceptsFlightInput,patrolPose,PATROL_LENGTH,PATROL_POINTS,FORMATIONS,assignFormation} from '../assets/hero-3d/flight-state.mjs';
test('pilot physical keys survive keyboard layouts and button focus; text fields retain typing',()=>{
 assert.equal(flightKey({code:'KeyW',key:'ц'}),'w');
 assert.equal(flightKey({code:'KeyQ',key:'й'}),'q');
 assert.equal(flightKey({code:'ArrowUp',key:'ArrowUp'}),null);
 assert.equal(acceptsFlightInput({tagName:'BUTTON'}),true);
 for(const tagName of ['INPUT','TEXTAREA','SELECT'])assert.equal(acceptsFlightInput({tagName}),false);
 assert.equal(acceptsFlightInput({isContentEditable:true}),false);
});
test('patrol closes continuously, passes both loops and follows every supplied waypoint',()=>{
 assert.deepEqual(patrolPose(0),patrolPose(PATROL_LENGTH));
 assert.ok(Math.hypot(patrolPose(PATROL_LENGTH-.01).x,patrolPose(PATROL_LENGTH-.01).z)<.011);
 for(const [x,z] of PATROL_POINTS){let nearest=Infinity;for(let d=0;d<PATROL_LENGTH;d+=.05){const p=patrolPose(d);nearest=Math.min(nearest,Math.hypot(p.x-x,p.z-z));}assert.ok(nearest<.06);}
});
test('arc-length patrol keeps horizontal speed even near the crossing and bends',()=>{
 for(let d=0;d<PATROL_LENGTH;d+=.7){const a=patrolPose(d),b=patrolPose(d+.024);assert.ok(Math.abs(Math.hypot(b.x-a.x,b.z-a.z)-.024)<.0003);}
});
test('formation transitions keep aircraft apart across all preset pairs',()=>{
 for(const from of Object.values(FORMATIONS))for(const to of Object.values(FORMATIONS)){
  const assigned=assignFormation(from,to);assert.equal(new Set(assigned.map(p=>p.join(','))).size,5);
  for(let t=0;t<=1;t+=.02){const p=from.map((v,i)=>v.map((a,j)=>a+(assigned[i][j]-a)*t));for(let i=0;i<5;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(p[i][0]-p[j][0],p[i][1]-p[j][1])>3.7);}
 }
});
import {nearestPatrolDistance} from '../assets/hero-3d/flight-state.mjs';
test('expanding formation at a map edge recenters every member within the world',()=>{
 const start={x:232,z:232},goal=FORMATIONS.line;
 const center=clampWaypoint(start,240,goal);
 for(let i=0;i<5;i++){const p=formationTarget(i,center,goal);assert.ok(Math.abs(p.x)<=240&&Math.abs(p.z)<=240);}
});
test('return from remote exploration is bounded and picks a nearby patrol point',()=>{
 const from={x:230,z:140},p=patrolPose(nearestPatrolDistance(from)),next=advanceWaypoint(from,p,1/60,2.4);
 assert.ok(Math.hypot(next.x-from.x,next.z-from.z)<=.04000001);
 assert.ok(p.x>20);
});
test('manual ceiling stays above high terrain outside the original small map',()=>{
 const p=manualStep({x:200,y:55,z:200},0,{up:1},1,2.4,()=>60,240);
 assert.ok(p.y>=61.25);
});
test('pilot keys do not consume browser keyboard shortcuts',()=>{
 for(const modifier of ['metaKey','ctrlKey','altKey'])assert.equal(flightKey({code:'KeyW',[modifier]:true}),null);
 assert.equal(flightKey({code:'KeyW',shiftKey:true}),'w');
});
