import * as T from '../assets/vendor/three/three.module.js';
import {RoundedBoxGeometry} from '../assets/vendor/three/RoundedBoxGeometry.js';
import {mergeGeometries} from '../assets/vendor/three/BufferGeometryUtils.js';

// Original reference-guided model: exposed plates, standoffs, PCB, battery,
// stereo bar, compact wiring and tube arms. Not manufacturer CAD.
const mat=(color,roughness=.5,metalness=.2)=>new T.MeshStandardMaterial({color,roughness,metalness});
const carbon=new T.MeshPhysicalMaterial({color:'#30363a',roughness:.48,metalness:.24,clearcoat:.2});
const black=mat('#11171c',.53,.25), metal=mat('#9da8ae',.26,.86), pcb=mat('#193d35',.6,.25), copper=mat('#a46b38',.4,.75),red=mat('#9e3027',.43),yellow=mat('#d5a22b',.48),silver=mat('#a6a8a5',.5,.52);
const lens=new T.MeshPhysicalMaterial({color:'#163749',metalness:0,roughness:.07,clearcoat:1});
const green=new T.MeshStandardMaterial({color:'#abd28b',emissive:'#6cba62',emissiveIntensity:1.5});
let detail=true; const geoCache=new Map();
function shared(key,make){if(!geoCache.has(key))geoCache.set(key,make());return geoCache.get(key);}
function add(g,geo,m,pos){const o=new T.Mesh(geo,m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,s,p,m,r=.025){return add(g,shared('b'+s+r+detail,()=>new RoundedBoxGeometry(...s,detail?2:1,r)),m,p);}
function cyl(g,r,h,p,m,n=24){return add(g,shared(`c${r},${h},${n}`,()=>new T.CylinderGeometry(r,r,h,n)),m,p);}
function tube(g,pts,r,m){return add(g,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),detail?28:10,r,detail?8:5,false),m,[0,0,0]);}
function bar(g,a,b,r,m){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);const o=cyl(g,r,d.length(),va.add(vb).multiplyScalar(.5).toArray(),m,12);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function batch(group){
 group.updateMatrixWorld(true);const byMaterial=new Map();
 for(const o of [...group.children])if(o.isMesh){let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrix);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(geo);group.remove(o);}
 for(const [material,list] of byMaterial){const geo=mergeGeometries(list,false);const merged=add(group,geo,material,[0,0,0]);merged.castShadow=!(material.transparent&&material.opacity<.1);for(const g of list)g.dispose();}
}
export function createResearchDrone(high=true){
 detail=high;
 const root=new T.Group(),body=new T.Group();root.add(body);
 // Low central equipment cage, inspired by reference image 3. The battery is
 // recessed below the flight controller, not mounted as a tower on the roof.
 // Chamfered, tapered frame plates: narrowed waist and drilled mounting wings.
 for(const y of [-.18,.30]){
  const sh=new T.Shape();sh.moveTo(-.31,-.59);sh.lineTo(.31,-.59);sh.lineTo(.43,-.45);sh.lineTo(.35,-.12);sh.lineTo(.35,.32);sh.lineTo(.43,.46);sh.lineTo(.28,.61);sh.lineTo(-.28,.61);sh.lineTo(-.43,.46);sh.lineTo(-.35,.32);sh.lineTo(-.35,-.12);sh.lineTo(-.43,-.45);sh.closePath();
  if(detail)for(const x of [-.25,.25])for(const z of [-.42,.42]){const hole=new T.Path();hole.absellipse(x,z,.04,.09,0,Math.PI*2,true);sh.holes.push(hole);}
  const plate=add(body,new T.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:true,bevelThickness:.005,bevelSize:.006,bevelSegments:2,curveSegments:12}),carbon,[0,y,0]);plate.rotation.x=-Math.PI/2;
 }
 box(body,[.67,.22,.83],[0,-.065,-.03],black,.052);
 for(const z of [-.30,.27]){box(body,[.70,.02,.072],[0,-.192,z],black,.006);for(const x of [-.35,.35])box(body,[.018,.23,.072],[x,-.08,z],black,.006);}
 for(const x of [-.36,.36])for(const z of [-.48,.48]){
  cyl(body,.020,.51,[x,.055,z],metal,12);
  for(const y of [-.205,.32]){cyl(body,.039,.015,[x,y,z],black,16);box(body,[.035,.005,.006],[x,y+.010,z],metal,.001);}
 }
 box(body,[.72,.018,.88],[0,.135,0],pcb,.008);
 box(body,[.32,.04,.36],[0,.173,-.1],black,.014);
 for(let i=0;i<12;i++)box(body,[.017,.075,.29],[-.143+i*.026,.224,-.1],metal,.003);
 for(let i=0;i<(detail?8:3);i++){
  box(body,[.072,.034,.065],[-.27,.164,-.32+i*.082],black,.004);
  box(body,[.05,.025,.054],[.27,.16,-.32+i*.084],black,.004);
  box(body,[.009,.004,.055],[.205,.149,-.32+i*.082],copper,.001);
 }
 // A recessed sensor/compute module with restrained upper profile.
 box(body,[.34,.082,.34],[0,.365,-.19],black,.025);
 for(let i=0;i<8;i++)box(body,[.026,.012,.21],[-.115+i*.033,.412,-.19],metal,.003);
 cyl(body,.128,.06,[0,.354,.24],metal,40);cyl(body,.114,.08,[0,.412,.24],lens,48);cyl(body,.108,.02,[0,.462,.24],black,40);
 box(body,[.77,.19,.04],[0,.105,.62],pcb,.007);box(body,[.74,.17,.11],[0,.11,.68],metal,.026);box(body,[.69,.125,.012],[0,.11,.743],black,.02);
 for(const [x,r] of [[-.255,.045],[.25,.045],[-.06,.033],[.09,.021]]){
  const a=cyl(body,r+.011,.012,[x,.11,.757],silver,32);a.rotation.x=Math.PI/2;
  const b=cyl(body,r,.014,[x,.11,.77],lens,40);b.rotation.x=Math.PI/2;
  const c=cyl(body,r*.68,.002,[x,.11,.78],black,24);c.rotation.x=Math.PI/2; const d=cyl(body,r*.59,.003,[x,.11,.783],lens,32);d.rotation.x=Math.PI/2;
 }
 // Small routed leads hug the equipment cage instead of dominating the form.
 tube(body,[[.25,-.06,-.41],[.47,.02,-.45],[.44,.22,-.17],[.26,.17,.17]],.018,red);
 tube(body,[[.18,-.06,-.41],[.40,.02,-.47],[.40,.22,-.12],[.22,.17,.17]],.018,black);
 box(body,[.12,.085,.10],[.40,.06,-.39],yellow,.012);
 for(let i=0;i<4;i++)tube(body,[[-.26,.13,.57],[-.40,.12,.34],[-.42,.02,-.10],[-.25,.14,-.27+i*.035]],.007,i%2?black:copper);
 box(body,[.05,.025,.03],[.27,.18,.45],green,.005);
 // Long carbon tube arms with machined clamp collars and visible motor coils.
 const rotors=[];
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=sx*1.19,z=sz*.96,from=[sx*.31,.01,sz*.39],to=[x,-.045,z];
  bar(body,from,to,.064,carbon);bar(body,[sx*.36,.016,sz*.43],[sx*.47,.010,sz*.51],.079,black);bar(body,[sx*1.02,-.03,sz*.85],[sx*1.10,-.037,sz*.9],.072,metal);
  box(body,[.24,.055,.27],[x,-.047,z],carbon,.024);
  cyl(body,.14,.14,[x,-.045,z],black,40);cyl(body,.131,.032,[x,.041,z],metal,40);
  for(let i=0;i<(detail?18:6);i++){const a=i*Math.PI/9;cyl(body,.011,.068,[x+Math.sin(a)*.109,.005,z+Math.cos(a)*.109],copper,6);}
  cyl(body,.113,.018,[x,.068,z],black,32);
  for(const dz of [-.07,.07])cyl(body,.016,.016,[x+.073,.083,z+dz],metal,10);
  tube(body,[[sx*.37,.12,sz*.40],[sx*.60,.08,sz*.63],[x,.005,z]],.009,red);
  const rotor=new T.Group();rotor.position.set(x,.109,z);root.add(rotor);rotors.push({group:rotor,direction:sx*sz});cyl(rotor,.047,.032,[0,0,0],black,32);
  for(const side of [-1,1]){
   const shape=new T.Shape();shape.moveTo(side*.035,-.028);shape.bezierCurveTo(side*.30,-.077,side*.60,-.034,side*.67,.011);shape.bezierCurveTo(side*.62,.077,side*.27,.09,side*.035,.028);
   const blade=add(rotor,new T.ExtrudeGeometry(shape,{depth:.008,bevelEnabled:true,bevelThickness:.003,bevelSize:.004,bevelSegments:2}),black,[0,0,0]);blade.rotation.x=-Math.PI/2;
  }
  const blur=add(rotor,new T.RingGeometry(.19,.66,56),new T.MeshBasicMaterial({color:'#8897a2',transparent:true,opacity:.035,side:T.DoubleSide,depthWrite:false}),[0,.01,0]);blur.rotation.x=-Math.PI/2;blur.castShadow=false;
  batch(rotor);
 }
 // Machined arm clamps, fastener heads, shock mounts and properly routed three-phase leads.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=sx*.43,z=sz*.46;
  for(const y of [-.046,.064]){const clamp=box(body,[.23,.037,.22],[x,y,z],black,.014);clamp.rotation.y=-sx*sz*.7;}
  if(detail)for(const dx of [-.065,.065]){cyl(body,.023,.13,[x+dx,.005,z],metal,12);cyl(body,.036,.021,[x+dx,.082,z],black,6);}
  for(const offset of detail?[-.024,0,.024]:[0])tube(body,[[sx*.33,.045,sz*.33+offset],[sx*.55,-.019,sz*.51+offset],[sx*.95,-.08,sz*.84+offset],[sx*1.16,-.10,sz*.96+offset]],.0075,black);
 }
 if(detail){
  // Rear antenna, strain-relieved signal cable and connector housings.
  for(const x of [-.23,.23]){const antenna=bar(body,[x,.22,-.44],[x*1.38,.61,-.56],.012,black);cyl(body,.028,.05,[x,.23,-.44],metal,16);}
  for(const x of [-.30,.30])for(const z of [-.38,.38]){cyl(body,.032,.045,[x,.12,z],red,16);cyl(body,.021,.007,[x,.147,z],metal,12);}
  for(let i=0;i<6;i++){box(body,[.015,.009,.10],[-.08+i*.03,.14,.43],silver,.002);}
  box(body,[.115,.055,.14],[-.29,.18,-.35],metal,.009);box(body,[.08,.027,.025],[-.29,.18,-.429],black,.004);
  tube(body,[[-.29,.18,-.45],[-.42,.22,-.5],[-.48,.13,-.26],[-.37,.12,.12]],.013,black);
 }
 // Slender belly skids, leaving the aircraft silhouette open and low.
 for(const x of [-.39,.39]){bar(body,[x,-.18,-.34],[x,-.46,-.36],.021,metal);bar(body,[x,-.18,.36],[x,-.46,.40],.021,metal);box(body,[.065,.052,1.03],[x,-.48,.04],black,.022);}
 batch(body);return {root,rotors};
}
