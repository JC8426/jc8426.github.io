import * as T from 'three';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {Sky} from '../vendor/three/Sky.js';
import {createResearchDrone,unitLabel} from './research-drone.js';
import {createWorld,groundHeight,WORLD_LIMIT} from './world.js';
import {manualStep,automaticPose,SPEED_MULTIPLIER,fleetCenter,clampWaypoint,advanceWaypoint,formationTarget} from './flight-state.mjs';

const hero=document.querySelector('.hero'),host=document.querySelector('#drone-scene');
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)'),darkMedia=matchMedia('(prefers-color-scheme: dark)');
const state={selected:0,mode:'overview',exploring:false,paused:reduce.matches,pace:.6,dark:false,ready:false};
let renderer,scene,camera,controls,day,night,sky,stars,keyLight,fillLight;
let units=[],frame=0,last=0,clock=0,active=true,transition=0,hudTime=0,failed=false,entryScroll=0;
const keys=new Set(),touch=new Set(),ray=new T.Raycaster(),pointer=new T.Vector2();
const cameraGoal=new T.Vector3(),targetGoal=new T.Vector3();
const tr=(en,zh)=>document.documentElement.lang.startsWith('zh')?zh:en;
const floor=(x,z)=>groundHeight(x,z,state.dark),selected=()=>units[state.selected];
let waypointArmed=false,mission=null,goalMarker,routeLine;
function waypointLabels(){
 $('[data-waypoint]').textContent=waypointArmed?tr('Click ground…','请点选地面…'):tr('Set waypoint','设置航点');
 $('[data-waypoint]').setAttribute('aria-pressed',String(waypointArmed));
 $('[data-cancel-waypoint]').disabled=!waypointArmed&&(!mission||mission.status==='cancelled');
 hero.classList.toggle('setting-waypoint',waypointArmed);
 const output=$('[data-waypoint-status]');output.hidden=!mission&&!waypointArmed;
 if(waypointArmed){output.textContent=tr('Click terrain to send all five aircraft. Dragging only moves the camera.','点选地面派遣五机；拖动仅调整视角。');return;}
 if(!mission)return;
 const distance=Math.hypot(mission.goal.x-mission.center.x,mission.goal.z-mission.center.z);
 const name=mission.status==='cancelled'?tr('Target cancelled · holding','航点已取消 · 悬停'):mission.status==='holding'?tr('Arrived · holding formation','已到达 · 编队悬停'):state.paused?tr('Waypoint paused','航点已暂停'):tr('Fleet en route','编队前往航点');
 output.textContent=`${name}  /  X ${mission.goal.x.toFixed(1)} · Z ${mission.goal.z.toFixed(1)}  /  ${distance.toFixed(1)} m`;
 host.dataset.mission=mission.status;
}
function makeWaypointVisuals(){
 goalMarker=new T.Group();scene.add(goalMarker);goalMarker.visible=false;
 for(const radius of [.65,1.05]){const ring=new T.Mesh(new T.RingGeometry(radius,radius+.045,80),new T.MeshBasicMaterial({color:'#d1deb0',side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;goalMarker.add(ring);}
 const mast=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3(0,2.5,0)]),new T.LineBasicMaterial({color:'#d1deb0',transparent:true,opacity:.65}));goalMarker.add(mast);
 routeLine=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#c3d5a1',dashSize:.5,gapSize:.3,transparent:true,opacity:.48}));routeLine.visible=false;scene.add(routeLine);
}
function refreshRoute(){
 if(!mission||!goalMarker)return;
 goalMarker.position.set(mission.goal.x,floor(mission.goal.x,mission.goal.z)+.10,mission.goal.z);
 const points=[];for(let i=0;i<=48;i++){const t=i/48,x=T.MathUtils.lerp(mission.start.x,mission.goal.x,t),z=T.MathUtils.lerp(mission.start.z,mission.goal.z,t);points.push(new T.Vector3(x,floor(x,z)+4.3,z));}
 routeLine.geometry.dispose();routeLine.geometry=new T.BufferGeometry().setFromPoints(points);routeLine.computeLineDistances();
}
function sendFleet(point){
 const center=fleetCenter(units.map(u=>u.root.position)),slots=units.map(u=>[u.root.position.x-center.x,u.root.position.z-center.z]);
 const goal=clampWaypoint(point,WORLD_LIMIT,slots);
 mission={center,start:{...center},goal,slots,status:'traveling',yaw:Math.atan2(goal.x-center.x,goal.z-center.z)};
 for(const u of units)u.manual=false;
 waypointArmed=false;keys.clear();touch.clear();goalMarker.visible=true;routeLine.visible=true;refreshRoute();labels();render();
}
function cancelWaypoint(){
 waypointArmed=false;
 if(mission){mission.center=fleetCenter(units.map(u=>u.root.position));mission.goal={...mission.center};mission.slots=units.map(u=>[u.root.position.x-mission.center.x,u.root.position.z-mission.center.z]);mission.status='cancelled';}
 if(goalMarker){goalMarker.visible=false;routeLine.visible=false;}labels();render();
}
function labels(){
 $('[data-scene-status]').textContent=state.dark?tr('LUNAR REGOLITH / 05 UNITS','月球表面 / 5 架无人机'):tr('DESERT EXPEDITION / 05 UNITS','沙漠巡航 / 5 架无人机');
 $('[data-scene-motion]').textContent=state.paused?tr('Resume','继续'):tr('Pause','暂停');
 $('[data-scene-motion]').setAttribute('aria-pressed',String(state.paused));
 $('[data-scene-explore]').textContent=state.exploring?tr('Exit exploration','退出探索'):tr('Explore fleet','探索集群');
 $('[data-scene-explore]').setAttribute('aria-pressed',String(state.exploring));
 $('[data-unit-heading]').textContent=`U0${state.selected+1}`;
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
 renderer.domElement.style.touchAction=on?'none':'pan-y';controls.enabled=on&&state.mode!=='fpv';if(!on)waypointArmed=false;keys.clear();touch.clear();labels();if(on)host.focus({preventScroll:true});
}
function view(mode){
 if(!state.ready)return;state.mode=mode;controls.enabled=state.exploring&&mode!=='fpv';transition=1;
 for(const u of units){u.root.visible=!(mode==='fpv'&&u===selected());u.marker.visible=u===selected()&&mode!=='fpv';u.label.visible=mode!=='fpv';}labels();
}
function choose(i){if(!Number.isInteger(i)||i<0||i>=units.length)return;state.selected=i;keys.clear();touch.clear();view(state.mode==='overview'?'follow':state.mode);if(state.exploring)host.focus({preventScroll:true});}
function syncTheme(){
 if(!state.ready)return;const previousDark=state.dark;
 state.dark=document.body.classList.contains('force-dark')||(!document.body.classList.contains('force-light')&&darkMedia.matches);
 day.visible=!state.dark;night.visible=state.dark;sky.visible=!state.dark;stars.visible=state.dark;
 scene.background=new T.Color(state.dark?'#030406':'#ccbaa0');scene.fog=state.dark?new T.Fog('#08090b',110,255):new T.Fog('#d5b992',95,250);
 keyLight.color.set(state.dark?'#eee9df':'#ffddb0');keyLight.intensity=state.dark?3.2:3.8;
 fillLight.color.set(state.dark?'#a8b5c8':'#dbe8ed');fillLight.groundColor.set(state.dark?'#1e2127':'#705b44');fillLight.intensity=state.dark?.46:.9;
 scene.environmentIntensity=state.dark?.3:.65;renderer.toneMappingExposure=state.dark?1.02:1;
 for(const u of units){const p=u.root.position,clearance=p.y-groundHeight(p.x,p.z,previousDark);p.y=floor(p.x,p.z)+Math.max(1.25,clearance);}
 host.dataset.environment=state.dark?'moon':'desert';refreshRoute();labels();render();
}
function cameraTargets(){
 const p=selected().root.position,yaw=selected().yaw;
 if(state.mode==='overview'){const center=fleetCenter(units.map(u=>u.root.position));targetGoal.set(center.x,floor(center.x,center.z)+3,center.z);cameraGoal.set(5,11,38);if(camera.aspect<.8)cameraGoal.multiplyScalar(1.35);cameraGoal.add(targetGoal);}
 else if(state.mode==='follow'){targetGoal.copy(p).add(new T.Vector3(0,.24,0));cameraGoal.set(4.5,2.8,7.5).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(p);}
 else if(state.mode==='fpv'){cameraGoal.set(0,.3,1).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(p);targetGoal.set(Math.sin(yaw)*20,1,Math.cos(yaw)*20).add(cameraGoal);}
 else{targetGoal.copy(controls.target);cameraGoal.copy(camera.position);}
}
function resize(){if(!renderer)return;const b=host.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.fov=b.width<650?56:40;camera.updateProjectionMatrix();render();}
function render(){if(renderer&&state.ready&&!failed)renderer.render(scene,camera);}
function stepCamera(dt){
 cameraTargets();
 if(state.mode==='fpv'){camera.position.lerp(cameraGoal,1-Math.exp(-dt*9));controls.target.lerp(targetGoal,1-Math.exp(-dt*9));camera.lookAt(controls.target);return;}
 if(transition>0){const b=1-Math.exp(-dt*5);camera.position.lerp(cameraGoal,b);controls.target.lerp(targetGoal,b);transition-=dt;camera.lookAt(controls.target);}
 else if(state.mode==='follow'||state.mode==='overview'){const delta=targetGoal.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(targetGoal);}
 controls.update();
}
function updateHud(u,speed){
 $('[data-flight-altitude]').textContent=(u.root.position.y-floor(u.root.position.x,u.root.position.z)).toFixed(1)+' m';
 $('[data-flight-speed]').textContent=speed.toFixed(2)+' m/s';$('[data-flight-distance]').textContent=u.distance.toFixed(1)+' m';
 $('[data-flight-state]').textContent=state.paused?tr('Paused','已暂停'):u.manual?tr('Manual control','手动操控'):mission?mission.status==='traveling'?tr('To waypoint','前往航点'):tr('Holding formation','编队悬停'):tr('Formation flight','编队飞行');host.dataset.flight=state.paused?'paused':u.manual?'manual':'formation';waypointLabels();
}
function animate(now){
 frame=requestAnimationFrame(animate);const dt=Math.min((now-(last||now))/1000,.05);last=now;
 if(!active||document.hidden||failed)return;if(!state.paused)clock+=dt*state.pace*SPEED_MULTIPLIER;let speed=0;
 if(mission&&mission.status==='traveling'&&!state.paused){const next=advanceWaypoint(mission.center,mission.goal,dt,2*state.pace*SPEED_MULTIPLIER);mission.center={x:next.x,z:next.z};if(next.arrived)mission.status='holding';}
 for(const u of units){const before=u.root.position.clone();
  if(!state.paused){
   if(u.manual){const held=(k,c)=>keys.has(k)||touch.has(c);const input={forward:+held('w','forward')-held('s','back'),side:+held('d','right')-held('a','left'),up:+held('r','rise')-held('f','fall'),yaw:+held('q','yawLeft')-held('e','yawRight')};const v=manualStep(before,u.yaw,u===selected()&&state.exploring?input:{},dt,2*state.pace*SPEED_MULTIPLIER,floor,WORLD_LIMIT);u.root.position.set(v.x,v.y,v.z);u.yaw=v.yaw;}
   else if(mission){const p=formationTarget(u.index,mission.center,mission.slots);const blend=1-Math.exp(-dt*4);u.root.position.set(mission.status==='traveling'?p.x:T.MathUtils.lerp(u.root.position.x,p.x,blend),T.MathUtils.lerp(u.root.position.y,floor(p.x,p.z)+4.3+Math.sin(clock*.55+u.index)*.10,blend),mission.status==='traveling'?p.z:T.MathUtils.lerp(u.root.position.z,p.z,blend));u.yaw+=Math.atan2(Math.sin(mission.yaw-u.yaw),Math.cos(mission.yaw-u.yaw))*(1-Math.exp(-dt*3));}
   else{const p=automaticPose(u.index,clock);u.root.position.lerp(new T.Vector3(p.x,floor(p.x,p.z)+p.height,p.z),1-Math.exp(-dt*2));u.yaw=p.yaw;}
   for(let i=0;i<u.rotors.length;i++)u.rotors[i].rotation.y+=dt*48*(i%2?1:-1);u.root.rotation.set(Math.sin(clock*.7+u.index)*.018,u.yaw,Math.cos(clock*.6+u.index)*.018);
  }
  const distance=before.distanceTo(u.root.position);u.distance+=distance;if(u===selected())speed=dt>0?distance/dt:0;
 }
 const lightCenter=fleetCenter(units.map(u=>u.root.position)),ground=floor(lightCenter.x,lightCenter.z);keyLight.position.set(lightCenter.x-24,ground+30,lightCenter.z+18);keyLight.target.position.set(lightCenter.x,ground,lightCenter.z);
 stepCamera(dt);hudTime+=dt;if(hudTime>.15){hudTime=0;updateHud(selected(),speed);}if(!state.paused||state.exploring||transition>0)render();
}
function init(){
 state.dark=document.body.classList.contains('force-dark')||(!document.body.classList.contains('force-light')&&darkMedia.matches);
 renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<650?1.25:1.65));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 host.appendChild(renderer.domElement);renderer.domElement.style.touchAction='pan-y';renderer.domElement.setAttribute('aria-label','Selectable five-aircraft fleet');
 scene=new T.Scene();camera=new T.PerspectiveCamera(40,1,.12,600);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=2.3;controls.maxDistance=80;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.08;controls.enabled=false;
 const manager=new T.LoadingManager();manager.onLoad=()=>{host.dataset.materials='loaded';render();};manager.onError=()=>{host.dataset.materials='partial';};
 const loader=new T.TextureLoader(manager),aniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());day=createWorld(false,loader,aniso);night=createWorld(true,loader,aniso);scene.add(day,night);
 sky=new Sky();sky.scale.setScalar(500);const un=sky.material.uniforms;un.turbidity.value=4;un.rayleigh.value=1.3;un.mieCoefficient.value=.004;un.sunPosition.value.set(-.45,.3,-.65);scene.add(sky);
 const envScene=new T.Scene();envScene.add(sky.clone());const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.03).texture;pmrem.dispose();
 keyLight=new T.DirectionalLight('#fff2dd',3);keyLight.position.set(-24,30,18);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:.5,far:120});keyLight.shadow.bias=-.0002;keyLight.shadow.normalBias=.035;scene.add(keyLight,keyLight.target);
 fillLight=new T.HemisphereLight('#bccbdb','#342d25',.5);scene.add(fillLight);const rim=new T.DirectionalLight('#a8c8ef',1.15);rim.position.set(10,8,-18);scene.add(rim);
 const starsArray=[];for(let i=0;i<1400;i++){const a=i*2.399963,y=((i*73)%1400)/1400,r=Math.sqrt(1-y*y);starsArray.push(Math.sin(a)*r*280,y*280,Math.cos(a)*r*280);}const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(starsArray,3));stars=new T.Points(sg,new T.PointsMaterial({size:.22,color:'#7a889d',fog:false}));scene.add(stars);
 const prototype=createResearchDrone();
 for(let i=0;i<5;i++){const root=prototype.root.clone(true);root.userData.unitId=i;const pose=automaticPose(i,0);root.position.set(pose.x,floor(pose.x,pose.z)+pose.height,pose.z);scene.add(root);const rotors=root.children.slice(1,5);const marker=new T.Mesh(new T.RingGeometry(1.55,1.57,80),new T.MeshBasicMaterial({color:'#b4c58b',side:T.DoubleSide,transparent:true,opacity:.55,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=-.7;marker.visible=i===0;root.add(marker);const label=unitLabel(`U0${i+1}`);root.add(label);units.push({root,index:i,manual:false,yaw:0,distance:0,rotors,marker,label});}
 makeWaypointVisuals();state.ready=true;camera.position.set(5,14,34);controls.target.set(0,3,-4);controls.update();host.dataset.ready='true';host.dataset.units='5';hero.classList.add('has-3d');$('.hero-video')?.pause();syncTheme();resize();cameraTargets();camera.position.copy(cameraGoal);controls.target.copy(targetGoal);controls.update();render();labels();updateHud(selected(),0);
 new ResizeObserver(resize).observe(host);new IntersectionObserver(e=>{active=e[0].isIntersecting;last=performance.now();},{threshold:0}).observe(host);
 let down=null,dragged=false;
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};dragged=false;});
 renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;});
 renderer.domElement.addEventListener('pointerup',()=>{down=null;});
 renderer.domElement.addEventListener('pointercancel',()=>{down=null;dragged=true;});
 renderer.domElement.addEventListener('click',e=>{
  if(dragged)return;const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);
  if(waypointArmed){const hits=ray.intersectObjects((state.dark?night:day).userData.grounds,false);if(hits.length)sendFleet(hits[0].point);else $('[data-waypoint-status]').textContent=tr('Choose a point on the terrain.','请在地面上选择航点。');return;}
  const hits=ray.intersectObjects(units.filter(u=>u.root.visible).map(u=>u.root),true);for(const hit of hits){let o=hit.object;while(o&&o.userData.unitId===undefined)o=o.parent;if(o){choose(o.userData.unitId);break;}}
 });
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback('3D context lost');});frame=requestAnimationFrame(animate);
}
function fallback(message){failed=true;state.ready=false;hero.classList.remove('has-3d','exploring');document.body.classList.remove('scene-exploring');host.dataset.ready='false';host.style.display='none';$('[data-scene-status]').textContent=tr('Video fallback','视频备用模式');all('.fleet-dock button,.fleet-dock input,[data-scene-explore]').forEach(b=>b.disabled=true);$('.hero-video')?.play().catch(()=>{});console.warn(message);}
all('[data-unit]').forEach(b=>b.addEventListener('click',()=>{explore(true);choose(Number(b.dataset.unit));}));all('[data-camera]').forEach(b=>b.addEventListener('click',()=>{explore(true);view(b.dataset.camera);host.focus({preventScroll:true});}));
$('[data-waypoint]').addEventListener('click',()=>{if(!state.ready)return;explore(true);waypointArmed=!waypointArmed;if(waypointArmed)view('overview');labels();host.focus({preventScroll:true});});
$('[data-cancel-waypoint]').addEventListener('click',cancelWaypoint);
$('[data-scene-explore]').addEventListener('click',()=>explore(!state.exploring));$('[data-scene-motion]').addEventListener('click',()=>{state.paused=!state.paused;keys.clear();touch.clear();labels();updateHud(selected(),0);render();});
$('[data-manual]').addEventListener('click',()=>{if(!state.ready)return;explore(true);if(!selected().manual&&mission)cancelWaypoint();selected().manual=!selected().manual;labels();updateHud(selected(),0);host.focus({preventScroll:true});});$('[data-rejoin]').addEventListener('click',()=>{if(!state.ready)return;selected().manual=false;keys.clear();touch.clear();labels();});
$('[data-scene-reset]').addEventListener('click',()=>{view('overview');transition=1;host.focus({preventScroll:true});});$('[data-flight-pace]').addEventListener('input',e=>{state.pace=Number(e.target.value);$('[data-pace-output]').textContent=state.pace.toFixed(1)+'×';});
host.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape'){explore(false);$('[data-scene-explore]').focus({preventScroll:true});return;}if(state.exploring&&selected()?.manual&&'wasdqerf'.includes(k)&&k.length===1){e.preventDefault();keys.add(k);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();touch.clear();});host.addEventListener('blur',()=>keys.clear());
all('[data-command]').forEach(b=>b.addEventListener('click',e=>{if(e.detail!==0||!state.ready||state.paused||!selected().manual)return;const cmd=b.dataset.command;const input={forward:cmd==='forward'?1:cmd==='back'?-1:0,side:cmd==='right'?1:cmd==='left'?-1:0,up:cmd==='rise'?1:cmd==='fall'?-1:0,yaw:cmd==='yawLeft'?1:cmd==='yawRight'?-1:0};const u=selected(),before=u.root.position.clone(),v=manualStep(before,u.yaw,input,.25,2*state.pace*SPEED_MULTIPLIER,floor,WORLD_LIMIT);u.root.position.set(v.x,v.y,v.z);u.yaw=v.yaw;u.distance+=before.distanceTo(u.root.position);render();}));
all('[data-command]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch.add(b.dataset.command);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>touch.delete(b.dataset.command));});
document.addEventListener('jc-theme-changed',syncTheme);document.addEventListener('jc-language-changed',()=>{if(state.ready)labels();});darkMedia.addEventListener('change',syncTheme);document.addEventListener('visibilitychange',()=>{keys.clear();touch.clear();last=performance.now();});reduce.addEventListener('change',()=>{state.paused=reduce.matches;if(state.ready){labels();render();}});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);keys.clear();touch.clear();});window.addEventListener('pageshow',e=>{if(e.persisted&&state.ready){last=0;frame=requestAnimationFrame(animate);}});
try{if(new URLSearchParams(location.search).get('hero')==='video')fallback('Video comparison mode');else init();}catch(error){fallback(error);}
