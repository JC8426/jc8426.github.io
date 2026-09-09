import * as T from 'three';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {Line2} from '../vendor/three/Line2.js';
import {LineGeometry} from '../vendor/three/LineGeometry.js';
import {LineMaterial} from '../vendor/three/LineMaterial.js';
import {Sky} from '../vendor/three/Sky.js';
import {createResearchDrone,loadResearchDroneAsset,clearResearchDroneAsset,unitLabel} from './research-drone.js';
import {groundHeight,WORLD_LIMIT} from './world.js';
import {glacierHeight,updateGlacier} from './glacier.js?v=8';
import {loadTerrain,disposeGraph} from './terrain-loader.js?v=8';
import {createDesertEnvironment,createLunarEnvironment,DESERT_SUN} from './lighting.js';
import {constrainSeparation} from './separation.mjs';
import {textureBytes,waypointFrame} from './resources.mjs';
import {manualStep,SPEED_MULTIPLIER,swarmCenter,clampWaypoint,advanceWaypoint,formationTarget,flightKey,acceptsFlightInput,FORMATIONS,assignFormation,patrolPose,nearestPatrolDistance} from './flight-state.mjs?v=7';

const hero=document.querySelector('.hero'),host=document.querySelector('#drone-scene');
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),darkMedia=matchMedia('(prefers-color-scheme: dark)');
const state={selected:0,mode:'follow',exploring:false,paused:reduce.matches,pace:1.5,dark:false,ready:false};
let renderer,scene,camera,controls,world,sky,stars,keyLight,fillLight,environmentTarget;
let terrainAbort,themeRevision=0,lightingDark=null,resizeObserver,visibilityObserver;
let separationState={intervened:false,minDistance:Infinity};
let units=[],frame=0,last=0,clock=0,active=true,transition=0,hudTime=0,failed=false,entryScroll=0;
const keys=new Set(),pressed=new Set(),touch=new Set(),ray=new T.Raycaster(),pointer=new T.Vector2();
const cameraGoal=new T.Vector3(),targetGoal=new T.Vector3();
const tr=(en,zh)=>document.documentElement.lang.startsWith('zh')?zh:en;
const environmentHeight=(x,z,lunar)=>lunar?groundHeight(x,z,true):glacierHeight(x,z);
const floor=(x,z)=>environmentHeight(x,z,state.dark),selected=()=>units[state.selected];
let waypointArmed=false,mission=null,goalMarker,routeLine,routeHalo;
let rejoining=false,patrolDistance=0,shotTime=0,shotIndex=0,slots=FORMATIONS.a.map(p=>[...p]),slotGoal=slots,formation='a';
const shots=[{mode:'follow',duration:9},{mode:'overview',duration:15},{mode:'broadcast',duration:12},{mode:'fpv',duration:7},{mode:'overview',duration:12}];
let broadcastPosition=new T.Vector3(55,32,-55),swarmSpeed=0,statsElapsed=0,statsFrames=0;
const query=new URLSearchParams(location.search),diagnostic=query.has('heroStats'),inspection=query.has('heroInspect');
const desiredTheme=()=>inspection?query.get('heroInspect')==='moon':document.body.classList.contains('force-dark')||(!document.body.classList.contains('force-light')&&darkMedia.matches);
function updateVisibility(){
 for(const u of units){u.root.visible=!(state.mode==='fpv'&&u===selected());u.marker.visible=state.exploring&&u===selected()&&state.mode!=='fpv';u.label.visible=state.exploring&&state.mode!=='fpv';}
}
function setFormation(name){
 if(!FORMATIONS[name]||!state.ready)return;
 const center=swarmCenter(units.map(u=>u.root.position));
 slots=units.map(u=>[u.root.position.x-center.x,u.root.position.z-center.z]);slotGoal=assignFormation(slots,FORMATIONS[name]);formation=name;
 for(const u of units)u.manual=false;
 if(mission){mission.center=center;mission.slots=slots;mission.goal=clampWaypoint(mission.goal,WORLD_LIMIT,slotGoal);mission.yaw=Math.atan2(mission.goal.x-center.x,mission.goal.z-center.z);if(Math.hypot(mission.goal.x-center.x,mission.goal.z-center.z)>.01&&mission.status==='holding')mission.status='traveling';refreshRoute();}
 keys.clear();pressed.clear();touch.clear();labels();
}
function reportResources(){
 if(!diagnostic)return;
 const gs=new Set(),ts=new Set(),buffers=new Set();let geometry=0,textures=0;
 scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean))for(const v of [...Object.values(m),...Object.values(m.uniforms||{}).map(u=>u.value)])if(v?.isTexture&&!v.isRenderTargetTexture)ts.add(v);});
 for(const g of gs)for(const a of [...Object.values(g.attributes),g.index].filter(Boolean)){if(!buffers.has(a.array)){geometry+=a.array.byteLength;buffers.add(a.array);}}
 for(const t of ts)textures+=textureBytes(t);
 let panel=$('[data-render-stats]');if(!panel){panel=document.createElement('output');panel.dataset.renderStats='';panel.style.cssText='position:fixed;left:8px;bottom:8px;z-index:100;background:#000c;color:white;padding:8px;font:11px monospace;pointer-events:none';document.body.append(panel);}
 panel.textContent=`${(statsFrames/(statsElapsed||1)).toFixed(1)} fps · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} triangles · geometry ${(geometry/1048576).toFixed(1)} MiB · texture estimate ${(textures/1048576).toFixed(1)} MiB (excludes targets/driver)`;
}

function waypointLabels(){
 $('[data-waypoint]').textContent=waypointArmed?tr('Click ground…','请点选地面…'):tr('Set waypoint','设置航点');
 $('[data-waypoint]').setAttribute('aria-pressed',String(waypointArmed));
 $('[data-cancel-waypoint]').disabled=!waypointArmed&&(!mission||mission.status==='cancelled'||mission.status==='manual-hold');
 hero.classList.toggle('setting-waypoint',waypointArmed);
 const output=$('[data-waypoint-status]');output.hidden=!mission&&!waypointArmed;
 if(waypointArmed){output.textContent=tr('Click terrain to send all five aircraft. Dragging only moves the camera.','点选地面派遣五机；拖动仅调整视角。');return;}
 if(!mission)return;
 if(mission.status==='manual-hold'){output.hidden=true;host.dataset.mission='manual-hold';return;}
 const distance=Math.hypot(mission.goal.x-mission.center.x,mission.goal.z-mission.center.z);
 const name=mission.status==='cancelled'?tr('Target cancelled · holding','航点已取消 · 悬停'):mission.status==='holding'?tr('Arrived · holding formation','已到达 · 编队悬停'):state.paused?tr('Waypoint paused','航点已暂停'):tr('Swarm en route','编队前往航点');
 output.textContent=`${name}  /  X ${mission.goal.x.toFixed(1)} · Z ${mission.goal.z.toFixed(1)}  /  ${distance.toFixed(1)} m`;
 host.dataset.mission=mission.status;
}
function makeWaypointVisuals(){
 goalMarker=new T.Group();scene.add(goalMarker);goalMarker.visible=false;
 for(const [inner,outer,color] of [[.62,.80,'#0b1923'],[.67,.73,'#78d9f5'],[1.02,1.16,'#0b1923'],[1.07,1.11,'#78d9f5']]){
  const ring=new T.Mesh(new T.RingGeometry(inner,outer,80),new T.MeshBasicMaterial({color,side:T.DoubleSide,depthWrite:false,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.renderOrder=12;goalMarker.add(ring);
 }
 const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');
 ctx.beginPath();ctx.arc(48,48,33,0,Math.PI*2);ctx.fillStyle='#0b1923';ctx.fill();ctx.strokeStyle='#78d9f5';ctx.lineWidth=5;ctx.stroke();
 ctx.beginPath();ctx.arc(48,48,8,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
 const pin=new T.Sprite(new T.SpriteMaterial({map:texture,sizeAttenuation:false,depthTest:false,depthWrite:false}));pin.scale.set(.035,.035,1);pin.position.y=4.3;pin.renderOrder=15;goalMarker.add(pin);
 const geometry=new LineGeometry().setPositions([0,0,0,0,0,0]);
 routeHalo=new Line2(geometry,new LineMaterial({color:'#0b1923',linewidth:6,depthTest:false,depthWrite:false}));routeHalo.renderOrder=10;
 routeLine=new Line2(geometry,new LineMaterial({color:'#78d9f5',linewidth:2.6,depthTest:false,depthWrite:false}));routeLine.renderOrder=11;routeLine.add(routeHalo);routeLine.visible=false;scene.add(routeLine);routeLine.traverse(o=>o.layers.set(1));goalMarker.traverse(o=>o.layers.set(1));
}
function refreshRoute(){
 if(!mission||!goalMarker)return;
 goalMarker.position.set(mission.goal.x,floor(mission.goal.x,mission.goal.z)+.10,mission.goal.z);
 const points=[];for(let i=0;i<=48;i++){const t=i/48,x=T.MathUtils.lerp(mission.start.x,mission.goal.x,t),z=T.MathUtils.lerp(mission.start.z,mission.goal.z,t);points.push(x,floor(x,z)+4.3,z);}
 routeLine.geometry.dispose();routeLine.geometry=routeHalo.geometry=new LineGeometry().setPositions(points);routeLine.computeLineDistances();
}
function sendSwarm(point){
 const center=swarmCenter(units.map(u=>u.root.position));slots=units.map(u=>[u.root.position.x-center.x,u.root.position.z-center.z]);
 const goal=clampWaypoint(point,WORLD_LIMIT,slots);
 slotGoal=slots.map(p=>[...p]);
 mission={center,start:{...center},goal,slots,status:'traveling',yaw:Math.atan2(goal.x-center.x,goal.z-center.z)};
 for(const u of units)u.manual=false;
 waypointArmed=false;keys.clear();pressed.clear();touch.clear();goalMarker.visible=true;routeLine.visible=true;refreshRoute();transition=1;labels();render();
}
function cancelWaypoint(){
 waypointArmed=false;
 if(mission){mission.center=swarmCenter(units.map(u=>u.root.position));mission.goal={...mission.center};mission.slots=units.map(u=>[u.root.position.x-mission.center.x,u.root.position.z-mission.center.z]);mission.status='cancelled';slots=mission.slots;slotGoal=slots.map(p=>[...p]);}
 if(goalMarker){goalMarker.visible=false;routeLine.visible=false;}labels();render();
}
function labels(){
 $('[data-scene-status]').textContent=state.dark?tr('LUNAR REGOLITH / 05 UNITS','月球表面 / 5 架无人机'):tr('GLACIAL LAGOON / 05 UNITS','冰川泻湖 / 5 架无人机');
 $('[data-scene-motion]').textContent=state.paused?tr('Resume','继续'):tr('Pause','暂停');
 $('[data-scene-motion]').setAttribute('aria-pressed',String(state.paused));
 $('[data-scene-explore]').textContent=state.exploring?tr('Exit exploration','退出探索'):tr('Browse scene','浏览场景');
 $('[data-scene-explore]').setAttribute('aria-pressed',String(state.exploring));
 $('[data-unit-heading]').textContent=state.exploring?`U0${state.selected+1}`:tr('SWARM / 05','集群 / 05');
 $('.swarm-dock').inert=!state.exploring;
 all('[data-formation]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.formation===formation)));
 $('[data-altitude-label]').textContent=state.exploring?tr('Ground clearance','离地高度'):tr('Mean clearance','平均净空');
 $('[data-speed-label]').textContent=state.exploring?tr('Speed','速度'):tr('Mean speed','平均速度');
 $('[data-distance-label]').textContent=state.exploring?tr('Distance','累计航程'):tr('Patrol progress','巡航进度');
 all('[data-unit]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.unit)===state.selected)));
 all('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===state.mode)));
 $('[data-manual]').setAttribute('aria-pressed',String(selected()?.manual||false));
 hero.classList.toggle('piloting',!!selected()?.manual&&state.exploring);
 host.dataset.selected=String(state.selected+1);host.dataset.camera=state.mode;
 waypointLabels();
}
function explore(on){
 if(!state.ready)return;
 if(on&&!state.exploring)entryScroll=window.scrollY;state.exploring=on;hero.classList.toggle('exploring',on);document.body.classList.toggle('scene-exploring',on);host.tabIndex=on?0:-1;if(!on)window.scrollTo({top:entryScroll,behavior:'instant'});
 renderer.domElement.style.touchAction=on?'none':'pan-y';controls.enabled=on&&state.mode!=='fpv';if(!on){
 const center=swarmCenter(units.map(u=>u.root.position));patrolDistance=nearestPatrolDistance(center);rejoining=true;
 slots=units.map(u=>[u.root.position.x-center.x,u.root.position.z-center.z]);slotGoal=assignFormation(slots,FORMATIONS[formation]);
 waypointArmed=false;mission=null;goalMarker.visible=routeLine.visible=false;for(const u of units)u.manual=false;state.paused=reduce.matches;shotIndex=0;shotTime=0;view('overview');}else if(state.mode==='broadcast')view('overview');
 updateVisibility();keys.clear();pressed.clear();touch.clear();labels();if(on)host.focus({preventScroll:true});
}
function view(mode){
 if(!state.ready)return;state.mode=mode;controls.enabled=state.exploring&&mode!=='fpv';transition=1;
 updateVisibility();labels();
}
function beginPilot(){
 if(!state.ready||state.loading||!state.exploring)return;
 const center=swarmCenter(units.map(u=>u.root.position));slots=units.map(u=>[u.root.position.x-center.x,u.root.position.z-center.z]);slotGoal=slots.map(p=>[...p]);
 mission={center,start:{...center},goal:{...center},slots,status:'manual-hold',yaw:selected().yaw};
 for(const u of units)u.manual=u===selected();
 goalMarker.visible=routeLine.visible=false;waypointArmed=false;state.paused=false;keys.clear();pressed.clear();touch.clear();labels();
}
function choose(i){if(!Number.isInteger(i)||i<0||i>=units.length)return;state.selected=i;keys.clear();pressed.clear();touch.clear();if(state.exploring)beginPilot();view(state.mode==='overview'?'follow':state.mode);if(state.exploring)host.focus({preventScroll:true});}
async function syncTheme(){
 if(!state.ready)return;const previousDark=state.dark,wanted=desiredTheme();
 const revision=++themeRevision;
 if(!world||world.userData.lunar!==wanted){
  state.loading=true;host.dataset.loading='true';keys.clear();pressed.clear();touch.clear();
  $('[data-scene-status]').textContent=tr('Preparing terrain…','正在准备地形…');
  terrainAbort?.abort();terrainAbort=new AbortController();
  const recycle=world?.userData.environment==='glacier'?null:world?.children.map(mesh=>({terrain:!!mesh.userData.terrain,attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key,a])=>[key,{array:a.array,itemSize:a.itemSize}])),index:mesh.geometry.index.array}));
  disposeGraph(world);world=null;
  try{const next=await loadTerrain(wanted,renderer,terrainAbort.signal,recycle);if(revision!==themeRevision||failed){disposeGraph(next);return;}world=next;scene.add(world);}
  catch(error){if(revision!==themeRevision||error.name==='AbortError')return;state.loading=false;fallback(error);return;}
 }
 if(lightingDark!==wanted){
  state.loading=true;scene.environment=null;environmentTarget?.dispose();environmentTarget=null;lightingDark=null;
  try{const next=wanted?createLunarEnvironment(renderer):await createDesertEnvironment(renderer);
   if(revision!==themeRevision||failed){next.dispose();return;}environmentTarget=next;scene.environment=next.texture;lightingDark=wanted;
  }catch(error){if(revision!==themeRevision)return;console.warn('Environment lighting unavailable; direct light remains active.',error);lightingDark=wanted;}
 }
 state.dark=wanted;state.loading=false;host.dataset.loading='false';host.dataset.materials='loaded';
 sky.visible=!state.dark;stars.visible=state.dark;
 scene.background=new T.Color(state.dark?'#030406':'#b4c9d6');scene.fog=state.dark?new T.Fog('#08090b',350,850):new T.Fog('#9fb8c5',220,850);
 keyLight.color.set(state.dark?'#eee9df':'#f2f7ff');keyLight.intensity=state.dark?4.1:3.8;
 fillLight.color.set(state.dark?'#a8b5c8':'#dbe8ed');fillLight.groundColor.set(state.dark?'#1e2127':'#345162');fillLight.intensity=state.dark?.55:.55;
 scene.environmentIntensity=state.dark?.45:.65;renderer.toneMappingExposure=state.dark?1.28:.92;
 for(const u of units){const p=u.root.position,clearance=p.y-environmentHeight(p.x,p.z,previousDark);p.y=floor(p.x,p.z)+Math.max(1.25,clearance);}
 camera.position.y+=environmentHeight(camera.position.x,camera.position.z,state.dark)-environmentHeight(camera.position.x,camera.position.z,previousDark);
 controls.target.y+=environmentHeight(controls.target.x,controls.target.z,state.dark)-environmentHeight(controls.target.x,controls.target.z,previousDark);
 host.dataset.environment=state.dark?'moon':'glacier';refreshRoute();labels();render();
}
function cameraTargets(){
 const p=selected().root.position,yaw=selected().yaw;
 if(state.mode==='overview'){const center=swarmCenter(units.map(u=>u.root.position));targetGoal.set(center.x,floor(center.x,center.z)+3,center.z);if(state.exploring&&(waypointArmed||mission)){
 const framing=waypointFrame(center,waypointArmed?null:mission?.goal,camera.aspect);targetGoal.set(framing.target.x,floor(framing.target.x,framing.target.z)+3,framing.target.z);cameraGoal.set(0,framing.height,framing.back).add(targetGoal);
 }else{cameraGoal.set(state.exploring?5:28,state.exploring?11:13,state.exploring?38:60);if(camera.aspect<.8)cameraGoal.multiplyScalar(1.35);cameraGoal.add(targetGoal);}}
 else if(state.mode==='broadcast'){const center=swarmCenter(units.map(u=>u.root.position));targetGoal.set(center.x,floor(center.x,center.z)+4,center.z);cameraGoal.copy(broadcastPosition);}
 else if(state.mode==='follow'){targetGoal.copy(p).add(new T.Vector3(0,.24,0));cameraGoal.set(4.5,2.8,8.5);if(state.exploring)cameraGoal.applyAxisAngle(new T.Vector3(0,1,0),yaw);cameraGoal.add(p);}
 else if(state.mode==='fpv'){cameraGoal.set(0,.3,1).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(p);targetGoal.set(Math.sin(yaw)*20,1,Math.cos(yaw)*20).add(cameraGoal);}
 else{targetGoal.copy(controls.target);cameraGoal.copy(camera.position);}
}
function resize(){if(!renderer)return;const b=host.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setPixelRatio(Math.min(devicePixelRatio,b.width<650?1.25:1.35,Math.sqrt(1800000/(b.width*b.height))));renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.fov=b.width<650?56:40;camera.updateProjectionMatrix();render();}
function render(){if(renderer&&state.ready&&!failed&&!state.loading)renderer.render(scene,camera);}
function stepCamera(dt){
 if(!state.exploring&&!state.paused&&!reduce.matches){
  shotTime+=dt;
  if(shotTime>shots[shotIndex].duration){
   const previousMode=state.mode;shotTime=0;shotIndex=(shotIndex+1)%shots.length;state.selected=(state.selected+1)%5;state.mode=shots[shotIndex].mode;if(state.mode==='follow')state.selected=0;
   const center=swarmCenter(units.map(u=>u.root.position));broadcastPosition.set(center.x+42,floor(center.x+42,center.z-38)+25,center.z-38);
   updateVisibility();cameraTargets();if(previousMode==='follow'&&state.mode==='overview'){transition=4;}else{camera.position.copy(cameraGoal);controls.target.copy(targetGoal);camera.lookAt(targetGoal);}host.dataset.camera=state.mode;host.dataset.shotHistory=((host.dataset.shotHistory||'')+','+state.mode).split(',').slice(-6).join(',');labels();
  }
 }
 cameraTargets();
 cameraGoal.y=Math.max(cameraGoal.y,floor(cameraGoal.x,cameraGoal.z)+1.4);
 if(!state.exploring){const pullback=transition>0?.9:3;transition=Math.max(0,transition-dt);camera.position.lerp(cameraGoal,1-Math.exp(-dt*pullback));controls.target.lerp(targetGoal,1-Math.exp(-dt*4));camera.lookAt(controls.target);return;}
 if(state.mode==='fpv'){camera.position.lerp(cameraGoal,1-Math.exp(-dt*9));controls.target.lerp(targetGoal,1-Math.exp(-dt*9));camera.lookAt(controls.target);return;}
 if(transition>0){const b=1-Math.exp(-dt*5);camera.position.lerp(cameraGoal,b);controls.target.lerp(targetGoal,b);transition-=dt;camera.lookAt(controls.target);}
 else if(state.mode==='follow'||state.mode==='overview'){const delta=targetGoal.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(targetGoal);}
 controls.update();
 const minimum=floor(camera.position.x,camera.position.z)+1.2;
 if(camera.position.y<minimum){camera.position.y=minimum;camera.lookAt(controls.target);}
}
function updateHud(u,speed){
 const clearance=state.exploring?u.root.position.y-floor(u.root.position.x,u.root.position.z):units.reduce((a,v)=>a+v.root.position.y-floor(v.root.position.x,v.root.position.z),0)/units.length;
 $('[data-flight-altitude]').textContent=clearance.toFixed(1)+' m';
 $('[data-flight-speed]').textContent=(state.exploring?speed:swarmSpeed).toFixed(2)+' m/s';
 $('[data-flight-distance]').textContent=state.exploring?u.distance.toFixed(1)+' m':(patrolPose(patrolDistance).progress*100).toFixed(0)+'%';
 $('[data-flight-state]').textContent=state.paused?tr('Paused','已暂停'):u.manual?tr('Manual control','手动操控'):mission?mission.status==='traveling'?tr('To waypoint','前往航点'):tr('Holding formation','编队悬停'):rejoining?tr('Returning to patrol','返回巡航'):tr('Figure-eight patrol','8 字巡航');
 const protection=$('[data-separation-state]');if(protection)protection.textContent=separationState.intervened?tr('Spacing protection · hold','间距保护 · 停止接近'):tr('Min spacing · ','最小机距 · ')+(Number.isFinite(separationState.minDistance)?separationState.minDistance.toFixed(1)+' m':tr('ready','就绪'));
 host.dataset.separation=separationState.intervened?'holding':'clear';
 host.dataset.flight=state.paused?'paused':u.manual?'manual':'formation';host.dataset.position=`${u.root.position.x.toFixed(3)},${u.root.position.y.toFixed(3)},${u.root.position.z.toFixed(3)}`;host.dataset.heading=u.yaw.toFixed(3);
 waypointLabels();reportResources();
}
function animate(now){
 frame=requestAnimationFrame(animate);const elapsed=(now-(last||now))/1000,dt=Math.min(elapsed,.05);last=now;
 if(!active||document.hidden||failed||state.loading)return;
 const previous=units.map(u=>u.root.position.clone()),previousPatrol=patrolDistance,previousClock=clock,previousSlots=slots.map(p=>[...p]),previousMission=mission?{center:{...mission.center},status:mission.status}:null;
 statsElapsed+=elapsed;if(statsElapsed>5){statsElapsed=elapsed;statsFrames=0;}
 if(!state.paused){clock+=dt*state.pace*SPEED_MULTIPLIER;if(!mission&&!rejoining)patrolDistance+=dt*2*state.pace*SPEED_MULTIPLIER;
  const blend=1-Math.exp(-dt*1.5);slots=slots.map((p,i)=>p.map((v,j)=>T.MathUtils.lerp(v,slotGoal[i][j],blend)));if(mission){mission.slots=slots;mission.center=clampWaypoint(mission.center,WORLD_LIMIT,slots);}
 }let speed=0;swarmSpeed=0;
 if(mission&&mission.status==='traveling'&&!state.paused){mission.yaw=Math.atan2(mission.goal.x-mission.center.x,mission.goal.z-mission.center.z);const next=advanceWaypoint(mission.center,mission.goal,dt,2*state.pace*SPEED_MULTIPLIER);mission.center=clampWaypoint(next,WORLD_LIMIT,slots);if(Math.hypot(mission.center.x-mission.goal.x,mission.center.z-mission.goal.z)<.01)mission.status='holding';}
 for(const u of units){const before=previous[u.index];
  if(!state.paused){
   if(u.manual){const held=(k,c)=>keys.has(k)||pressed.has(k)||touch.has(c);const input={forward:+held('w','forward')-held('s','back'),side:+held('d','right')-held('a','left'),up:+held('r','rise')-held('f','fall'),yaw:+held('q','yawLeft')-held('e','yawRight')};const v=manualStep(before,u.yaw,u===selected()&&state.exploring?input:{},dt,2*state.pace*SPEED_MULTIPLIER,floor,WORLD_LIMIT);u.root.position.set(v.x,v.y,v.z);u.yaw=v.yaw;}
   else if(mission){const p=formationTarget(u.index,mission.center,mission.slots),xy=mission.status==='traveling'?p:advanceWaypoint(before,p,dt,2*state.pace*SPEED_MULTIPLIER);const blend=1-Math.exp(-dt*4);u.root.position.set(xy.x,T.MathUtils.lerp(u.root.position.y,floor(xy.x,xy.z)+4.3+Math.sin(clock*.55+u.index)*.10,blend),xy.z);u.yaw+=Math.atan2(Math.sin(mission.yaw-u.yaw),Math.cos(mission.yaw-u.yaw))*(1-Math.exp(-dt*3));}
   else{const c=patrolPose(patrolDistance),p=formationTarget(u.index,c,slots);p.x=T.MathUtils.clamp(p.x,-WORLD_LIMIT,WORLD_LIMIT);p.z=T.MathUtils.clamp(p.z,-WORLD_LIMIT,WORLD_LIMIT);if(rejoining){const step=advanceWaypoint(u.root.position,p,dt,2*state.pace*SPEED_MULTIPLIER);u.root.position.set(step.x,T.MathUtils.lerp(u.root.position.y,floor(step.x,step.z)+c.height,1-Math.exp(-dt*3)),step.z);}else u.root.position.lerp(new T.Vector3(p.x,floor(p.x,p.z)+c.height,p.z),1-Math.exp(-dt*3));u.yaw+=Math.atan2(Math.sin(c.yaw-u.yaw),Math.cos(c.yaw-u.yaw))*(1-Math.exp(-dt*4));}
   for(let i=0;i<u.rotors.length;i++)u.rotors[i].rotation.y+=dt*48*(i%2?1:-1);u.root.rotation.set(Math.sin(clock*.7+u.index)*.018,u.yaw,Math.cos(clock*.6+u.index)*.018);
  }
  u.root.position.y=Math.max(u.root.position.y,floor(u.root.position.x,u.root.position.z)+1.25);
 }
 separationState=constrainSeparation(previous,units.map(u=>u.root.position),{clearance:4.4,limit:WORLD_LIMIT});
 const fraction=separationState.fraction;
 if(fraction<1){
  patrolDistance=previousPatrol+(patrolDistance-previousPatrol)*fraction;clock=previousClock+(clock-previousClock)*fraction;
  slots=previousSlots.map((p,i)=>p.map((v,j)=>v+(slots[i][j]-v)*fraction));
  if(mission&&previousMission){mission.center={x:previousMission.center.x+(mission.center.x-previousMission.center.x)*fraction,z:previousMission.center.z+(mission.center.z-previousMission.center.z)*fraction};mission.slots=slots;if(previousMission.status==='traveling')mission.status=Math.hypot(mission.center.x-mission.goal.x,mission.center.z-mission.goal.z)<.01?'holding':'traveling';}
 }
 for(const u of units){const accepted=separationState.positions[u.index];u.root.position.set(accepted.x,Math.max(accepted.y,floor(accepted.x,accepted.z)+1.25),accepted.z);const distance=previous[u.index].distanceTo(u.root.position);u.distance+=distance;swarmSpeed+=dt>0?distance/dt/units.length:0;if(u===selected())speed=dt>0?distance/dt:0;}
 if(rejoining){const c=patrolPose(patrolDistance);rejoining=!units.every(u=>{const p=formationTarget(u.index,c,slotGoal);return Math.hypot(u.root.position.x-p.x,u.root.position.z-p.z)<.15;});}
 pressed.clear();
 const lightCenter=swarmCenter(units.map(u=>u.root.position)),ground=floor(lightCenter.x,lightCenter.z);keyLight.position.set(lightCenter.x+(state.dark?-52:DESERT_SUN.x*65),ground+(state.dark?22:DESERT_SUN.y*65),lightCenter.z+(state.dark?26:DESERT_SUN.z*65));keyLight.target.position.set(lightCenter.x,ground,lightCenter.z);
 updateGlacier(world,clock);stepCamera(dt);hudTime+=dt;if(hudTime>.15){hudTime=0;updateHud(selected(),speed);}if(!state.paused||state.exploring||transition>0){render();statsFrames++;}
}
async function init(){
 state.dark=desiredTheme();
 renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:inspection});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.25:1.65));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 host.dataset.revision='v7-project-in-loop';host.dataset.shotHistory=state.mode;host.dataset.astc=String(renderer.extensions.has('WEBGL_compressed_texture_astc'));host.appendChild(renderer.domElement);renderer.domElement.style.touchAction='pan-y';renderer.domElement.setAttribute('aria-label','Selectable five-aircraft swarm');
 scene=new T.Scene();camera=new T.PerspectiveCamera(40,1,.12,1800);camera.layers.enable(1);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=2.3;controls.maxDistance=300;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.08;controls.enabled=false;
 sky=new Sky();sky.scale.setScalar(1400);const un=sky.material.uniforms;un.turbidity.value=2.3;un.rayleigh.value=2.1;un.mieCoefficient.value=.004;un.sunPosition.value.copy(DESERT_SUN);scene.add(sky);
 keyLight=new T.DirectionalLight('#fff2dd',3);keyLight.position.set(-24,30,18);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:.5,far:200});keyLight.shadow.bias=-.0002;keyLight.shadow.normalBias=.035;scene.add(keyLight,keyLight.target);
 fillLight=new T.HemisphereLight('#bccbdb','#342d25',.5);scene.add(fillLight);const rim=new T.DirectionalLight('#a8c8ef',1.15);rim.position.set(10,8,-18);scene.add(rim);
 const starsArray=[];for(let i=0;i<1400;i++){const a=i*2.399963,y=((i*73)%1400)/1400,r=Math.sqrt(1-y*y);starsArray.push(Math.sin(a)*r*1200,y*1200,Math.cos(a)*r*1200);}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starsArray,3));stars=new T.Points(sg,new T.PointsMaterial({size:.5,color:'#7a889d',fog:false}));scene.add(stars);
 await loadResearchDroneAsset();if(failed||state.destroyed){clearResearchDroneAsset();return;}
 const prototype=createResearchDrone();
 for(let i=0;i<5;i++){const root=prototype.root.clone(true);root.userData.unitId=i;const pose={...formationTarget(i,patrolPose(0),slots),height:5.3};root.position.set(pose.x,floor(pose.x,pose.z)+pose.height,pose.z);scene.add(root);const rotors=root.children.slice(1,5);const marker=new T.Mesh(new T.RingGeometry(1.55,1.57,80),new T.MeshBasicMaterial({color:'#b4c58b',side:T.DoubleSide,transparent:true,opacity:.55,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=-.7;marker.visible=i===0;marker.layers.set(1);root.add(marker);const label=unitLabel(`U0${i+1}`);label.layers.set(1);root.add(label);units.push({root,index:i,manual:false,yaw:0,distance:0,rotors,marker,label});}
 makeWaypointVisuals();all('.swarm-dock button,.swarm-dock input,.scene-camera-rail button,[data-scene-explore]').forEach(b=>b.disabled=false);state.ready=true;camera.position.set(5,14,34);controls.target.set(0,3,-4);controls.update();host.dataset.ready='true';host.dataset.units='5';hero.classList.add('has-3d');const video=$('.hero-video');if(video){video.pause();video.querySelectorAll('source').forEach(source=>source.removeAttribute('src'));video.removeAttribute('src');video.load();}
 await syncTheme();if(failed||state.destroyed)return;hero.classList.remove('scene-loading');resize();cameraTargets();camera.position.copy(cameraGoal);controls.target.copy(targetGoal);controls.update();updateVisibility();render();labels();updateHud(selected(),0);
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);visibilityObserver=new IntersectionObserver(e=>{active=e[0].isIntersecting;last=performance.now();},{threshold:0});visibilityObserver.observe(host);
 let down=null,dragged=false;
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};dragged=false;});
 renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;});
 renderer.domElement.addEventListener('pointerup',()=>{down=null;});
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;dragged=true;});
 renderer.domElement.addEventListener('click',e=>{
  if(dragged||state.loading||!world)return;const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);
  if(waypointArmed){const hits=ray.intersectObjects(world.userData.grounds,false);if(hits.length)sendSwarm(hits[0].point);else $('[data-waypoint-status]').textContent=tr('Choose a point on the terrain.','请在地面上选择航点。');return;}
  const hits=ray.intersectObjects(units.filter(u=>u.root.visible).map(u=>u.root),true);for(const hit of hits){let o=hit.object;while(o&&o.userData.unitId===undefined)o=o.parent;if(o){choose(o.userData.unitId);break;}}
 });
 if(inspection){state.paused=true;state.mode='free';const {installInspection}=await import('./inspection.js');installInspection({T,hero,scene,world,camera,controls,units,renderer,render,query,floor});}
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(!state.destroyed)fallback('3D context lost');});frame=requestAnimationFrame(animate);
}
function releaseScene(){
 state.destroyed=true;state.ready=false;themeRevision++;resizeObserver?.disconnect();visibilityObserver?.disconnect();lightingDark=null;cancelAnimationFrame(frame);terrainAbort?.abort();controls?.dispose();keyLight?.shadow.dispose();disposeGraph(scene);world=null;units=[];clearResearchDroneAsset();environmentTarget?.dispose();environmentTarget=null;scene=null;renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();renderer=null;goalMarker=routeLine=routeHalo=sky=stars=keyLight=fillLight=controls=camera=null;
}
function fallback(message){if(failed)return;failed=true;releaseScene();state.ready=false;hero.classList.remove('has-3d','exploring','scene-loading');document.body.classList.remove('scene-exploring');host.dataset.ready='false';host.style.display='none';$('[data-scene-status]').textContent=tr('Video fallback','视频备用模式');all('.swarm-dock button,.swarm-dock input,.scene-camera-rail button,[data-scene-explore]').forEach(b=>b.disabled=true);const video=$('.hero-video');if(video){video.querySelectorAll('source').forEach(source=>{source.src=source.dataset.src;});video.load();video.play().catch(()=>{});}console.warn(message);}
all('[data-unit]').forEach(b=>b.addEventListener('click',()=>{explore(true);choose(Number(b.dataset.unit));}));all('[data-camera]').forEach(b=>b.addEventListener('click',()=>{explore(true);view(b.dataset.camera);host.focus({preventScroll:true});}));
$('[data-waypoint]').addEventListener('click',()=>{if(!state.ready)return;explore(true);waypointArmed=!waypointArmed;if(waypointArmed)view('overview');labels();host.focus({preventScroll:true});});
$('[data-cancel-waypoint]').addEventListener('click',cancelWaypoint);
$('[data-scene-explore]').addEventListener('click',()=>explore(!state.exploring));$('[data-scene-motion]').addEventListener('click',()=>{state.paused=!state.paused;keys.clear();pressed.clear();touch.clear();labels();updateHud(selected(),0);render();});
$('[data-manual]').addEventListener('click',()=>{if(!state.ready)return;explore(true);if(selected().manual){selected().manual=false;keys.clear();pressed.clear();touch.clear();labels();}else beginPilot();updateHud(selected(),0);host.focus({preventScroll:true});});$('[data-rejoin]').addEventListener('click',()=>{if(!state.ready)return;selected().manual=false;keys.clear();pressed.clear();touch.clear();labels();});
$('[data-scene-reset]').addEventListener('click',()=>{view('overview');transition=1;host.focus({preventScroll:true});});$('[data-flight-pace]').addEventListener('input',e=>{state.pace=T.MathUtils.clamp(Number(e.target.value),.2,3);$('[data-pace-output]').textContent=state.pace.toFixed(1)+'×';});
window.addEventListener('keydown',e=>{
 if(!state.exploring)return;
 if(e.code==='Escape'){explore(false);$('[data-scene-explore]').focus({preventScroll:true});return;}
 const k=flightKey(e);if(state.ready&&!state.loading&&acceptsFlightInput(e.target)&&k){e.preventDefault();if(!selected()?.manual)beginPilot();keys.add(k);if(!e.repeat)pressed.add(k);}
});
window.addEventListener('keyup',e=>{const k=flightKey(e);if(k)keys.delete(k);});
window.addEventListener('blur',()=>{keys.clear();pressed.clear();touch.clear();});
 document.addEventListener('focusin',e=>{if(!acceptsFlightInput(e.target)){keys.clear();pressed.clear();touch.clear();}});
 all('.nav a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{if(state.exploring)explore(false);}));
all('[data-formation]').forEach(b=>b.addEventListener('click',()=>setFormation(b.dataset.formation)));
all('[data-command]').forEach(b=>b.addEventListener('click',e=>{if(e.detail!==0||!state.ready||state.paused||!selected().manual)return;const cmd=b.dataset.command;const input={forward:cmd==='forward'?1:cmd==='back'?-1:0,side:cmd==='right'?1:cmd==='left'?-1:0,up:cmd==='rise'?1:cmd==='fall'?-1:0,yaw:cmd==='yawLeft'?1:cmd==='yawRight'?-1:0};const u=selected(),before=u.root.position.clone(),v=manualStep(before,u.yaw,input,.25,2*state.pace*SPEED_MULTIPLIER,floor,WORLD_LIMIT);const previous=units.map(unit=>unit.root.position.clone()),proposed=previous.map(p=>p.clone());proposed[u.index].set(v.x,v.y,v.z);separationState=constrainSeparation(previous,proposed,{clearance:4.4,limit:WORLD_LIMIT});const accepted=separationState.positions[u.index];u.root.position.set(accepted.x,Math.max(accepted.y,floor(accepted.x,accepted.z)+1.25),accepted.z);u.yaw=v.yaw;u.distance+=before.distanceTo(u.root.position);updateHud(u,0);render();}));
all('[data-command]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(b.dataset.command);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touch.delete(b.dataset.command));});
document.addEventListener('jc-theme-changed',syncTheme);document.addEventListener('jc-language-changed',()=>{if(state.ready)labels();});darkMedia.addEventListener('change',syncTheme);document.addEventListener('visibilitychange',()=>{keys.clear();pressed.clear();touch.clear();last=performance.now();});reduce.addEventListener('change',()=>{state.paused=reduce.matches;if(state.ready){labels();render();}});
window.addEventListener('pagehide',()=>{keys.clear();pressed.clear();touch.clear();releaseScene();});
window.addEventListener('pageshow',e=>{
 if(!e.persisted)return;
 state.destroyed=false;state.ready=false;state.exploring=false;state.mode='follow';state.selected=0;state.paused=reduce.matches;failed=false;mission=null;rejoining=false;patrolDistance=clock=shotTime=shotIndex=last=0;
 slots=FORMATIONS.a.map(p=>[...p]);slotGoal=slots;formation='a';hero.classList.remove('has-3d','exploring');hero.classList.add('scene-loading');document.body.classList.remove('scene-exploring');host.style.display='';
 init().catch(fallback);
});
try{if(new URLSearchParams(location.search).get('hero')==='video')fallback('Video comparison mode');else init().catch(fallback);}catch(error){fallback(error);}
