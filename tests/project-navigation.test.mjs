import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {projects,filterProjects,categories} from '../assets/project-data.js';

test('every project and technical note resolves to an actual case page',()=>{
 assert.equal(projects.length,8);assert.equal(new Set(projects.map(p=>p.href)).size,8);
 for(const p of projects){
  const file=new URL('../'+p.href,import.meta.url);assert.ok(existsSync(file),p.href);
  const html=readFileSync(file,'utf8');assert.ok(html.includes(`id="${p.noteAnchor}"`),`${p.href}#${p.noteAnchor}`);
  assert.ok(existsSync(new URL('../assets/portfolio/thumbs/'+p.image,import.meta.url)),p.image);
 }
});
test('search matches useful terms across both languages and combines with categories',()=>{
 assert.deepEqual(filterProjects('ROS').map(p=>p.id),['uav-simulation','rcap-2026']);
 assert.deepEqual(filterProjects('SQLite').map(p=>p.id),['software-data']);
 assert.ok(filterProjects('协作').some(p=>p.id==='robotedge-lab'));
 assert.equal(filterProjects('ROS','software').length,0);
 assert.equal(filterProjects('unfindable-query').length,0);
 for(const c of categories)assert.ok(filterProjects('',c.id).every(p=>c.id==='all'||p.category===c.id));
});
test('gallery columns have equal card counts and matching total aspect ratios',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const columns=[...html.matchAll(/<div class="parallax-col">([\s\S]*?)<\/div>/g)].map(m=>m[1]);assert.equal(columns.length,4);
 const ratios={wide:10/16,tall:3/2,portrait:4/3,square:1,panorama:9/16};
 const heights=columns.map(c=>{const kinds=[...c.matchAll(/class="parallax-shot (\w+)"/g)].map(m=>m[1]);assert.equal(kinds.length,6);return kinds.reduce((sum,k)=>sum+ratios[k],0);});
 heights.forEach(h=>assert.ok(Math.abs(h-heights[0])<1e-8));
});
