import * as T from 'three';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.js';
import { Sky } from '../vendor/three/Sky.js';

const host = document.querySelector('#drone-scene');
const status = document.querySelector('[data-scene-status]');
const motionButton = document.querySelector('[data-scene-motion]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
let renderer, controls, paused = reduce.matches, active = true, failed = false;
let scene, camera, desert, moon, drone, sky, sunLight, fill, earth, stars;
let time = 0, last = 0, currentDark = false, frame = 0;
const rotors = [];
const waterUniform = { value: 0 };
const random = (() => { let s = 48019; return () => { s = Math.imul(1664525,s)+1013904223|0; return (s>>>0)/4294967296; }; })();
const assets = new URL('./', import.meta.url);
const mat = (color, roughness=.45, metalness=.05) => new T.MeshStandardMaterial({color,roughness,metalness});
function mesh(geo, material, parent, xyz=[0,0,0]) {
  const m = new T.Mesh(geo,material); m.position.set(...xyz); m.castShadow=true; m.receiveShadow=true; parent.add(m); return m;
}
function box(parent,size,position,material,r=.06) { return mesh(new RoundedBoxGeometry(...size,4,r),material,parent,position); }
function cylinder(parent,r,h,pos,material,segments=48) { return mesh(new T.CylinderGeometry(r,r,h,segments),material,parent,pos); }
function rod(parent,from,to,r,material) {
  const a=new T.Vector3(...from),b=new T.Vector3(...to),delta=b.clone().sub(a);
  const m=mesh(new T.CylinderGeometry(r,r,delta.length(),12),material,parent,a.add(b).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
}
function label(parent,text,w,h,pos) {
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle='#a7b4b8';ctx.font='500 36px monospace';ctx.textAlign='center';ctx.fillText(text,256,73);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
  const m=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),parent,pos);m.castShadow=false;return m;
}
function makeDrone() {
  const g=new T.Group();scene.add(g);
  const shell=new T.MeshPhysicalMaterial({color:'#e4e7e5',metalness:.28,roughness:.27,clearcoat:.55,clearcoatRoughness:.22});
  const lower=mat('#474e53',.36,.55),rubber=mat('#151d24',.75),metal=mat('#939da2',.22,.85),copper=mat('#a97346',.35,.75);
  const glass=new T.MeshPhysicalMaterial({color:'#10272f',metalness:.7,roughness:.12,clearcoat:1});
  box(g,[1.12,.32,1.65],[0,0,0],shell,.15);
  box(g,[1.03,.18,1.51],[0,-.19,0],lower,.09);
  box(g,[.93,.20,1.22],[0,.23,-.12],shell,.095);
  box(g,[.68,.018,.91],[0,.339,-.16],mat('#c6cecf',.4,.4),.008);
  // Body seams, cooling slots, battery latch, and status indicator.
  for(const sign of [-1,1]) {
    box(g,[.012,.016,1.18],[sign*.52,-.065,-.05],rubber,.005);
    for(let i=0;i<10;i++)box(g,[.018,.07,.034],[sign*.558,-.01,-.47+i*.069],rubber,.008);
    for(const z of [-.52,.52])cylinder(g,.024,.008,[sign*.39,.338,z],metal,12);
  }
  box(g,[.30,.025,.12],[0,.35,-.60],lower,.01);
  cylinder(g,.045,.012,[0,.351,.24],rubber);
  const led=new T.MeshStandardMaterial({color:'#71f5bb',emissive:'#2dcc86',emissiveIntensity:2});
  box(g,[.2,.025,.018],[0,.10,-.832],led,.009);
  label(g,'AUTONOMY / 04',.62,.12,[0,.344,-.15]).rotation.x=-Math.PI/2;
  // Front stereo module: two IR lenses, projector and RGB lens.
  box(g,[.86,.24,.20],[0,-.12,.86],metal,.045);
  box(g,[.79,.183,.018],[0,-.12,.97],rubber,.032);
  for(const [x,r] of [[-.30,.058],[.30,.058],[.07,.038],[-.09,.022]]) {
    const ring=cylinder(g,r+.014,.019,[x,-.11,.99],metal);ring.rotation.x=Math.PI/2;
    const lens=cylinder(g,r,.022,[x,-.11,1.004],glass);lens.rotation.x=Math.PI/2;
    const glint=cylinder(g,r*.43,.002,[x-.012,-.096,1.018],mat('#286988',.12,.8));glint.rotation.x=Math.PI/2;
  }
  label(g,'D435 · STEREO',.37,.045,[.02,-.197,.982]);
  // Roof-mounted omnidirectional lidar, with continuous optical band.
  cylinder(g,.275,.045,[0,.39,.05],metal);
  cylinder(g,.245,.13,[0,.478,.05],rubber);
  cylinder(g,.251,.065,[0,.487,.05],glass);
  cylinder(g,.242,.055,[0,.575,.05],metal);
  cylinder(g,.18,.025,[0,.612,.05],lower);
  for(let i=0;i<20;i++) {
    const a=i*Math.PI/10;box(g,[.012,.09,.023],[Math.sin(a)*.247,.474,.05+Math.cos(a)*.247],lower,.004).rotation.y=a;
  }
  // Four articulated arms, motors and two-blade carbon propellers.
  for(const sx of [-1,1])for(const sz of [-1,1]) {
    const x=sx*1.32,z=sz*1.08, joint=[sx*.47,-.04,sz*.53];
    const arm=rod(g,joint,[x,-.055,z],.088,shell);arm.scale.z=.75;
    cylinder(g,.13,.15,joint,lower);
    rod(g,[sx*.65,-.08,sz*.66],[x,-.095,z],.027,rubber);
    cylinder(g,.172,.15,[x,.01,z],lower);
    cylinder(g,.139,.085,[x,.12,z],metal);
    cylinder(g,.12,.034,[x,.177,z],rubber);
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;cylinder(g,.012,.069,[x+Math.cos(a)*.115,.10,z+Math.sin(a)*.115],copper,6);
    }
    const rotor=new T.Group();rotor.position.set(x,.215,z);g.add(rotor);rotors.push({group:rotor,direction:sx*sz});
    cylinder(rotor,.07,.045,[0,0,0],rubber);
    for(const side of [-1,1]) {
      const shape=new T.Shape();shape.moveTo(.04*side,-.045);shape.bezierCurveTo(.32*side,-.09,.69*side,-.035,.75*side,.022);shape.bezierCurveTo(.64*side,.10,.24*side,.11,.04*side,.035);
      const blade=mesh(new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.006,bevelThickness:.004}),mat('#242d30',.4,.45),rotor);
      blade.rotation.x=-Math.PI/2;
    }
    const blur=mesh(new T.RingGeometry(.26,.76,64),new T.MeshBasicMaterial({color:'#a0acb1',transparent:true,opacity:.045,side:T.DoubleSide,depthWrite:false}),rotor);blur.rotation.x=-Math.PI/2;blur.castShadow=false;
    // Landing struts and rubber feet.
    rod(g,[x,-.13,z],[x*.88,-.46,z*.96],.031,metal);
    box(g,[.16,.065,.27],[x*.88,-.485,z*.96],rubber,.025);
    box(g,[.08,.04,.05],[x,-.10,z+sz*.16],sx<0?mat('#ab3931',.3):led,.015);
  }
  return g;
}
function noise(x,z) { return Math.sin(x*.39+Math.cos(z*.23))*Math.cos(z*.31)+Math.sin(x*.81+z*.57)*.31+Math.sin(x*2.17-z*1.73)*.08; }
const craters=Array.from({length:26},()=>({x:(random()-.5)*95,z:(random()-.5)*95,r:1.6+random()*5.5}));
function terrainHeight(x,z,lunar) {
  if(!lunar) {
    const d=Math.sqrt((x+7)**2*.5+(z+11)**2);
    const dunes=1.4+Math.sin(x*.082+z*.09)*2+Math.sin(z*.12-x*.05)*1.5;
    return dunes*Math.min(1,Math.max(0,(d-7)/16)) + noise(x,z)*.15 - Math.exp(-d*d/32)*.8;
  }
  let h=noise(x*.52,z*.52)*.7+noise(x*1.7,z*1.7)*.08;
  for(const c of craters) {
    const q=Math.hypot(x-c.x,z-c.z)/c.r;
    if(q<1.6)h+=(-Math.exp(-q*q*3)*.8+Math.exp(-(((q-1)/.18)**2))*.22)*c.r;
  }
  return h;
}
function terrain(lunar,textures) {
  const group=new T.Group();scene.add(group);
  const geo=new T.PlaneGeometry(160,160,192,192);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;const colors=[];const color=new T.Color();
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i),h=terrainHeight(x,z,lunar);pos.setY(i,h);
    if(lunar)color.setHSL(.61,.045,.30+Math.min(.25,(h+3)*.033));
    else {const d=Math.hypot((x+7)*.72,z+11);color.set(d<7.4?'#5c6d36':'#dcc2a0');color.multiplyScalar(.87+noise(x,z)*.05);}
    colors.push(color.r,color.g,color.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const material=new T.MeshStandardMaterial({vertexColors:true,map:lunar?null:textures.color,normalMap:textures.normal,normalScale:new T.Vector2(lunar?.65:.45,lunar?.65:.45),roughnessMap:textures.rough,roughness:.95});
  const ground=mesh(geo,material,group);ground.castShadow=false;
  // Reusable irregular rocks: three instanced batches with true 3D silhouettes.
  const rockGeo=new T.IcosahedronGeometry(1,3),rockMat=mat(lunar?'#60676b':'#a99271',.94);
  const rp=rockGeo.attributes.position; for(let i=0;i<rp.count;i++){const k=1+noise(rp.getX(i)*5,rp.getZ(i)*5)*.12;rp.setXYZ(i,rp.getX(i)*k,rp.getY(i)*k,rp.getZ(i)*k);}rockGeo.computeVertexNormals();rockMat.normalMap=textures.normal;
  const count=lunar?260:100;const rocks=new T.InstancedMesh(rockGeo,rockMat,count);rocks.castShadow=true;rocks.receiveShadow=true;
  const obj=new T.Object3D();
  for(let i=0;i<count;i++) {
    const x=(random()-.5)*110,z=(random()-.5)*110,s=.08+random()**3*1.3;
    obj.position.set(x,terrainHeight(x,z,lunar)+s*.15,z);obj.rotation.set(random()*3,random()*6,random()*2);obj.scale.set(s*1.4,s*.65,s);obj.updateMatrix();rocks.setMatrixAt(i,obj.matrix);
  }group.add(rocks);
  return group;
}
function palm(parent,x,z,height) {
  const g=new T.Group();parent.add(g);g.position.set(x,terrainHeight(x,z,false),z);
  const trunk=mat('#65503a',.92),leaf=mat('#44633a',.72);leaf.side=T.DoubleSide;
  const bend=(random()-.5)*.7;const leafPositions=[];
  for(let i=0;i<12;i++) {
    const y=i*height/12;const m=mesh(new T.CylinderGeometry(.095-i*.002,.12-i*.002,height/12+0.015,9),trunk,g,[bend*(i/12)**2,y+height/24,0]);m.rotation.z=-bend*.18;
  }
  for(let f=0;f<10;f++) {
    const angle=f*Math.PI/5+random()*.2;const len=1.6+random()*.7;
    const a=new T.Vector3(bend,height,0),b=new T.Vector3(bend+Math.sin(angle)*len*.55,height+.6,Math.cos(angle)*len*.55),c=new T.Vector3(bend+Math.sin(angle)*len,height-.5,Math.cos(angle)*len);
    const curve=new T.QuadraticBezierCurve3(a,b,c);mesh(new T.TubeGeometry(curve,10,.018,5,false),leaf,g);
    // Tapered feather leaflets, each is geometry rather than a flat foliage card.
    for(let j=1;j<22;j++)for(const side of [-1,1]) {
      const t=j/22,p=curve.getPoint(t),width=Math.sin(t*Math.PI)*.32;
      const tip=p.clone().add(new T.Vector3(Math.cos(angle)*side*width,-.13,-Math.sin(angle)*side*width));
      const next=curve.getPoint(Math.min(1,t+.048));
      for(const v of [p,tip,next])leafPositions.push(v.x,v.y,v.z);
    }
  }
  const leaves=new T.BufferGeometry();leaves.setAttribute('position',new T.Float32BufferAttribute(leafPositions,3));leaves.computeVertexNormals();mesh(leaves,leaf,g);
}
function init() {
  renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
  host.appendChild(renderer.domElement);renderer.domElement.style.touchAction='pan-y';renderer.domElement.setAttribute('aria-label','Interactive quadcopter scene');
  scene=new T.Scene();camera=new T.PerspectiveCamera(38,1,.1,550);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=2.8;controls.maxDistance=45;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.08;controls.enablePan=true;
  // Wheel remains page scrolling unless user explicitly enters exploration.
  controls.enableZoom=false;controls.enableRotate=false;controls.enablePan=false;renderer.domElement.style.touchAction='pan-y';
  const loader=new T.TextureLoader();const texture=(file,color=false)=>{const t=loader.load(new URL(file,assets).href,()=>render());t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(20,20);t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;return t;};
  const textures={color:texture('sand-color.jpg',true),normal:texture('sand-normal.jpg'),rough:texture('sand-roughness.jpg')};
  desert=terrain(false,textures);moon=terrain(true,textures);
  const waterGeo=new T.CircleGeometry(6.5,96);waterGeo.rotateX(-Math.PI/2);const wp=waterGeo.attributes.position;for(let i=1;i<wp.count;i++){const a=Math.atan2(wp.getZ(i),wp.getX(i)),f=.95+Math.sin(a*5)*.03+Math.cos(a*9)*.02;wp.setXYZ(i,wp.getX(i)*f,0,wp.getZ(i)*f);}
  const waterMat=new T.MeshPhysicalMaterial({color:'#14534b',metalness:.12,roughness:.22,clearcoat:.55,transparent:true,opacity:.92});
  waterMat.onBeforeCompile=shader=>{shader.uniforms.uTime=waterUniform;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += sin(position.x * 4.0 + uTime) * cos(position.z * 3.0 - uTime*.7) * .022;');};
  const water=mesh(waterGeo,waterMat,desert,[-7,-.18,-11]);water.scale.x=.78;water.castShadow=false;
  for(let i=0;i<13;i++){const a=i*2.4,r=6.5+random()*2;palm(desert,-7+Math.sin(a)*r*.82,-11+Math.cos(a)*r,2.5+random()*2);}
  sky=new Sky();sky.scale.setScalar(400);scene.add(sky);const uniforms=sky.material.uniforms;uniforms.turbidity.value=3;uniforms.rayleigh.value=1.7;uniforms.mieCoefficient.value=.004;uniforms.mieDirectionalG.value=.83;
  const sun=new T.Vector3(30,20,-35).normalize();uniforms.sunPosition.value.copy(sun);
  // Image-based lighting from the sky provides metal and clearcoat reflections.
  const pmrem=new T.PMREMGenerator(renderer);const envScene=new T.Scene();const envSky=sky.clone();envScene.add(envSky);const env=pmrem.fromScene(envScene,.02);scene.environment=env.texture;pmrem.dispose();
  sunLight=new T.DirectionalLight('#fff2d5',4.2);sunLight.position.set(18,26,12);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);Object.assign(sunLight.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:80});sunLight.shadow.bias=-.0004;sunLight.shadow.normalBias=.04;scene.add(sunLight);
  fill=new T.HemisphereLight('#dcecff','#8e704d',1.4);scene.add(fill);
  const rim=new T.DirectionalLight('#c5deff',1.5);rim.position.set(-8,5,-12);scene.add(rim);
  const starPositions=[];for(let i=0;i<1800;i++){const a=random()*Math.PI*2,y=random(),r=Math.sqrt(1-y*y);starPositions.push(Math.sin(a)*r*240,y*240,Math.cos(a)*r*240);}
  const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));stars=new T.Points(starGeo,new T.PointsMaterial({color:'#cfdef3',size:.38,sizeAttenuation:true,fog:false}));scene.add(stars);
  earth=mesh(new T.SphereGeometry(8,48,32),new T.MeshStandardMaterial({color:'#386d9c',roughness:.9,emissive:'#133552',emissiveIntensity:.25,fog:false}),scene,[-45,23,-105]);earth.castShadow=false;
  const cloud=mesh(new T.SphereGeometry(8.05,48,32),new T.MeshPhysicalMaterial({color:'#a8cde5',transparent:true,opacity:.11,roughness:1,fog:false}),earth);cloud.position.set(0,0,0);
  drone=makeDrone();drone.position.set(0,3.4,.28);drone.rotation.y=-.2;reset();syncTheme();resize();
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries=>{active=entries[0].isIntersecting;if(active)last=performance.now();},{threshold:0}).observe(host);
  document.addEventListener('visibilitychange',()=>{last=performance.now();});
  document.addEventListener('jc-theme-changed',syncTheme);darkQuery.addEventListener('change',syncTheme);document.addEventListener('jc-language-changed',updateLabels);
  reduce.addEventListener('change',()=>{paused=reduce.matches;updateLabels();render();});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;host.dataset.ready='false';document.querySelector('.hero').classList.remove('has-3d');document.querySelector('.hero-video')?.play().catch(()=>{});status.textContent='3D paused — reload to restore';});
  host.dataset.ready='true';document.querySelector('.hero').classList.add('has-3d');document.querySelector('.hero-video')?.pause();
  requestAnimationFrame(animate);
}
function lang(){return document.documentElement.lang.startsWith('zh');}
function updateLabels(){
  if(failed)return;
  status.textContent=currentDark?(lang()?'月球 · 太空':'LUNAR / SPACE'):(lang()?'绿洲 · 沙漠':'OASIS / DESERT');
  motionButton.textContent=paused?(lang()?'继续飞行':'Resume flight'):(lang()?'暂停飞行':'Pause flight');
  motionButton.setAttribute('aria-pressed',String(paused));
  const on=controls?.enableRotate;explore.textContent=on?(lang()?'退出浏览':'Exit explore'):(lang()?'浏览场景':'Explore scene');
}
function syncTheme(){
  currentDark=document.body.classList.contains('force-dark')||(!document.body.classList.contains('force-light')&&darkQuery.matches);
  desert.visible=!currentDark;moon.visible=currentDark;sky.visible=!currentDark;stars.visible=currentDark;earth.visible=false;
  scene.background=new T.Color(currentDark?'#03060d':'#d7d9cd');scene.fog=currentDark?new T.Fog('#070b13',65,170):new T.Fog('#d9c9ad',48,145);
  sunLight.color.set(currentDark?'#e5edff':'#fff0cc');sunLight.intensity=currentDark?3.4:4.2;
  fill.color.set(currentDark?'#7896c2':'#dcecff');fill.groundColor.set(currentDark?'#252a38':'#8e704d');fill.intensity=currentDark?.24:1.1;
  scene.environmentIntensity=currentDark?.4:.85;host.dataset.environment=currentDark?'moon':'oasis';updateLabels();render();
}
function reset(){
  camera.position.set(4.6,4.7,8.1);controls.target.set(0,2.9,0);controls.update();
}
function resize(){if(!renderer)return;const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.fov=width<650?64:38;camera.updateProjectionMatrix();render();}
function render(){if(renderer&&!failed&&scene&&camera)renderer.render(scene,camera);}
function animate(now){
  frame=requestAnimationFrame(animate);
  const dt=Math.min((now-(last||now))/1000,.05);last=now;
  if(!active||document.hidden||failed)return;
  if(!paused){time+=dt;for(const rotor of rotors)rotor.group.rotation.y+=dt*34*rotor.direction;waterUniform.value=time;}
  drone.position.set(Math.sin(time*.16)*.65,3.4+Math.sin(time*.65)*.12,Math.cos(time*.16)*.28);
  drone.rotation.set(Math.sin(time*.45)*.018,Math.sin(time*.13)*.15-.2,Math.cos(time*.5)*.022);
  if(!paused||controls.enableRotate){controls.update();render();}
}
motionButton.addEventListener('click',()=>{paused=!paused;updateLabels();});
document.querySelector('[data-scene-reset]').addEventListener('click',()=>{reset();render();});
const explore=document.querySelector('[data-scene-explore]');
explore.addEventListener('click',()=>{
  if(!controls)return;
  const enabled=!controls.enableRotate;controls.enableZoom=controls.enableRotate=controls.enablePan=enabled;
  renderer.domElement.style.touchAction=enabled?'none':'pan-y';document.querySelector('.hero').classList.toggle('exploring',enabled);explore.setAttribute('aria-pressed',String(enabled));
  explore.textContent=enabled?(lang()?'退出浏览':'Exit explore'):(lang()?'浏览场景':'Explore scene');
  host.setAttribute('tabindex',enabled?'0':'-1');if(enabled)host.focus();
});
host.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&controls?.enableRotate){explore.click();explore.focus();}
  if(event.key.toLowerCase()==='r'){reset();render();}
});
try{if(new URLSearchParams(location.search).get('hero')==='video'){status.textContent='VIDEO / A–B PREVIEW';document.querySelectorAll('.scene-buttons button').forEach(b=>b.disabled=true);}else{init();}}catch(error){failed=true;host.dataset.ready='false';status.textContent=lang()?'3D 不可用 · 显示视频':'3D unavailable · video fallback';console.warn('Hero 3D fallback:',error);}
window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);last=0;});
window.addEventListener('pageshow',event=>{if(event.persisted&&renderer&&!failed){last=0;frame=requestAnimationFrame(animate);}});
