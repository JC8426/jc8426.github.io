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
