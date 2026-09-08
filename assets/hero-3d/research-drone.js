import * as T from 'three';
import {RoundedBoxGeometry} from '../vendor/three/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/three/BufferGeometryUtils.js';

// Original reference-guided model: exposed plates, standoffs, PCB, battery,
// stereo bar, wiring and prop guards. Not manufacturer CAD.
const mat=(color,roughness=.5,metalness=.2)=>new T.MeshStandardMaterial({color,roughness,metalness});
function carbonMap(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 for(let y=0;y<128;y+=4)for(let z=0;z<128;z+=4){const n=(Math.floor(y/8)+Math.floor(z/8))%2;x.fillStyle=n?'#343a3f':'#1f252b';x.fillRect(z,y,4,4);x.fillStyle=n?'#454c51':'#2e3439';x.fillRect(z,y,3,1);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,3);return t;
}
const carbon=new T.MeshPhysicalMaterial({map:carbonMap(),color:'#60686b',roughness:.48,metalness:.24,clearcoat:.2});
const black=mat('#11171c',.53,.25), metal=mat('#9da8ae',.26,.86), pcb=mat('#193d35',.6,.25), copper=mat('#a46b38',.4,.75),red=mat('#9e3027',.43),yellow=mat('#d5a22b',.48),silver=mat('#a6a8a5',.5,.52);
const lens=new T.MeshPhysicalMaterial({color:'#163749',metalness:.72,roughness:.11,clearcoat:1});
const green=new T.MeshStandardMaterial({color:'#abd28b',emissive:'#6cba62',emissiveIntensity:1.5});
const geoCache=new Map();
function shared(key,make){if(!geoCache.has(key))geoCache.set(key,make());return geoCache.get(key);}
function add(g,geo,m,pos){const o=new T.Mesh(geo,m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,s,p,m,r=.025){return add(g,shared('b'+s+r,()=>new RoundedBoxGeometry(...s,3,r)),m,p);}
function cyl(g,r,h,p,m,n=24){return add(g,shared(`c${r},${h},${n}`,()=>new T.CylinderGeometry(r,r,h,n)),m,p);}
function tube(g,pts,r,m){return add(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),20,r,7,false),m,[0,0,0]);}
function bar(g,a,b,r,m){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const o=cyl(g,r,d.length(),va.add(vb).multiplyScalar(.5).toArray(),m,12);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function batch(group){
 group.updateMatrixWorld(true);const byMaterial=new Map();
 for(const o of [...group.children])if(o.isMesh){let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(geo);group.remove(o);}
 for(const [material,list] of byMaterial){const geo=mergeGeometries(list,false);add(group,geo,material,[0,0,0]);for(const g of list)g.dispose();}
}
export function createResearchDrone(){
 const root=new T.Group(),body=new T.Group();root.add(body);
 // Three offset carbon plates and aluminium through-standoffs.
 for(const y of [-.12,.21,.56])box(body,[1.15,.047,1.27],[0,y,0],carbon,.035);
 for(const x of [-.48,.48])for(const z of [-.52,.52]){
  cyl(body,.026,.67,[x,.21,z],metal,12);
  for(const y of [-.15,.25,.594]){cyl(body,.048,.018,[x,y,z],black,16);box(body,[.046,.007,.008],[x,y+.011,z],metal,.002);}
 }
 // Electronics board, processor, sockets, traces and finned heat sink.
 box(body,[.91,.024,1.03],[0,.10,.01],pcb,.008);
 box(body,[.38,.05,.37],[0,.15,-.07],black,.012);
 for(let i=0;i<13;i++)box(body,[.022,.13,.35],[-.19+i*.031,.205,-.07],metal,.004);
 for(let i=0;i<8;i++){box(body,[.08,.04,.10],[-.34,.15,-.37+i*.10],black,.006);box(body,[.014,.003,.10],[.32,.115,-.35+i*.105],copper,.001);}
 for(const z of [-.34,-.13,.1,.3])box(body,[.12,.11,.12],[.45,.12,z],metal,.012);
 box(body,[.24,.17,.045],[.18,.01,-.64],yellow,.009);
 box(body,[.16,.045,.03],[-.29,.155,.51],green,.009);
 // Foil-wrapped battery pack, inset ends and broad hook-and-loop straps.
 box(body,[.69,.51,.76],[0,.85,-.08],silver,.065);
 box(body,[.64,.45,.035],[0,.85,.31],black,.025);
 for(const z of [-.31,.12]){
  box(body,[.75,.028,.10],[0,1.119,z],black,.009);
  for(const x of [-.364,.364])box(body,[.026,.55,.10],[x,.849,z],black,.008);
 }
 // Stereo depth camera bar with visible PCB and four optical apertures.
 box(body,[.88,.22,.055],[0,.275,.688],pcb,.008);
 box(body,[.84,.20,.14],[0,.28,.728],metal,.03);
 box(body,[.79,.153,.018],[0,.28,.811],black,.02);
 for(const [x,r] of [[-.30,.057],[.29,.057],[-.09,.044],[.08,.026]]){
  const a=cyl(body,r+.013,.018,[x,.28,.83],silver,32);a.rotation.x=Math.PI/2;
  const b=cyl(body,r,.022,[x,.28,.845],lens,32);b.rotation.x=Math.PI/2;
  const c=cyl(body,r*.45,.003,[x-.01,.295,.861],mat('#3e7180',.15,.6),20);c.rotation.x=Math.PI/2;
 }
 // Compact 360-degree scanning unit, offset behind battery to avoid occlusion.
 cyl(body,.19,.055,[0,.64,-.48],metal);
 cyl(body,.158,.19,[0,.762,-.48],black,48);
 cyl(body,.161,.095,[0,.77,-.48],lens,48);
 cyl(body,.15,.04,[0,.875,-.48],metal,48);
 // Thick power leads, individual signal wires and yellow power connector.
 tube(body,[[.21,1.01,.3],[.45,.82,.43],[.57,.44,.36],[.55,.20,.2]],.032,red);
 tube(body,[[.11,1.01,.3],[.37,.82,.49],[.49,.42,.42],[.48,.20,.18]],.032,black);
 box(body,[.20,.14,.16],[.52,.36,.37],yellow,.018);
 for(let i=0;i<5;i++)tube(body,[[-.34,.3,.64],[-.49,.16,.42],[-.5,.04,.0],[-.28,.1,-.26+i*.04]],.009,i%2?black:yellow);
 const rotors=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=sx*.91,z=sz*.85;
  const arm=box(body,[.32,.065,1.1],[sx*.54,-.10,sz*.51],carbon,.018);arm.rotation.y=-sx*sz*.78;
  cyl(body,.15,.14,[x,-.105,z],black,40);
  cyl(body,.142,.048,[x,-.024,z],metal,40);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;cyl(body,.014,.06,[x+Math.sin(a)*.113,-.028,z+Math.cos(a)*.113],copper,6);}
  cyl(body,.1,.022,[x,.016,z],black,32);
  const rotor=new T.Group();rotor.position.set(x,.053,z);root.add(rotor);rotors.push({group:rotor,direction:sx*sz});
  cyl(rotor,.055,.03,[0,0,0],metal);
  for(const side of [-1,1]){const blade=box(rotor,[.53,.012,.085],[side*.28,0,0],black,.006);blade.rotation.y=side*.12;}
  const blur=add(rotor,new T.RingGeometry(.15,.58,48),new T.MeshBasicMaterial({color:'#8897a2',transparent:true,opacity:.055,side:T.DoubleSide,depthWrite:false}),[0,.012,0]);blur.rotation.x=-Math.PI/2;blur.castShadow=false;
  const guard=add(body,new T.TorusGeometry(.61,.025,6,56,Math.PI*1.6),carbon,[x,-.02,z]);guard.rotation.x=Math.PI/2;guard.rotation.z=sx>0?-.3:Math.PI-.3;
  for(const a of [0,Math.PI])bar(body,[x,-.10,z],[x+Math.cos(a)*.60,-.04,z+Math.sin(a)*.60],.016,carbon);
  bar(body,[sx*.43,-.15,sz*.40],[sx*.60,-.52,sz*.6],.033,black);
  box(body,[.13,.08,.21],[sx*.60,-.56,sz*.6],black,.022);
  batch(rotor);
 }
 // Batch static material groups: five vehicles share this geometry via cloning.
 batch(body);
 return {root,rotors};
}
export function unitLabel(text){
 const c=document.createElement('canvas');c.width=256;c.height=80;const x=c.getContext('2d');x.fillStyle='#101711d0';x.roundRect(0,0,256,80,18);x.fill();x.fillStyle='#d6e4c5';x.font='500 40px monospace';x.textAlign='center';x.fillText(text,128,54);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(.85,.265,1);s.position.y=1.42;return s;
}
