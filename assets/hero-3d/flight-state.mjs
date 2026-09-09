// Pure simulation helpers; no DOM/WebGL dependency. Units are illustrative.
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function manualStep(position,heading,input,dt,speed,floor,limit=90){
 const turn=input.yaw||0,yaw=heading+turn*dt*.85;
 const f=input.forward||0,s=input.side||0,m=Math.max(1,Math.hypot(f,s));
 const x=clamp(position.x+(Math.sin(yaw)*f+Math.cos(yaw)*s)/m*speed*dt,-limit,limit);
 const z=clamp(position.z+(Math.cos(yaw)*f-Math.sin(yaw)*s)/m*speed*dt,-limit,limit);
 const y=clamp(position.y+(input.up||0)*speed*.6*dt,floor(x,z)+1.25,Math.max(18,floor(x,z)+18));
 return {x,y,z,yaw};
}
export function automaticPose(index,time){
 const phase=time*.055,slots=[[0,0],[-4,-4],[4,-4],[-8,-8],[8,-8]],slot=slots[index];
 return {x:Math.sin(phase)*6+slot[0],z:Math.sin(phase*.7)*4+slot[1],height:4.3+Math.sin(time*.55+index)*.16,yaw:Math.sin(phase)*.28};
}

export const SPEED_MULTIPLIER=2;
export const FORMATION_SLOTS=[[0,4.8],[-4,.8],[4,.8],[-8,-3.2],[8,-3.2]];
export function fleetCenter(positions){return {x:positions.reduce((s,p)=>s+p.x,0)/positions.length,z:positions.reduce((s,p)=>s+p.z,0)/positions.length};}
export function clampWaypoint(point,limit=90,slots=FORMATION_SLOTS){return {x:clamp(point.x,-limit-Math.min(...slots.map(s=>s[0])),limit-Math.max(...slots.map(s=>s[0]))),z:clamp(point.z,-limit-Math.min(...slots.map(s=>s[1])),limit-Math.max(...slots.map(s=>s[1])))};}
export function advanceWaypoint(current,target,dt,speed){
 const dx=target.x-current.x,dz=target.z-current.z,distance=Math.hypot(dx,dz),step=Math.min(distance,Math.max(0,dt*speed));
 if(distance<1e-8)return {...target,remaining:0,arrived:true};
 return {x:current.x+dx/distance*step,z:current.z+dz/distance*step,remaining:distance-step,arrived:distance-step<1e-6};
}
export function formationTarget(index,center,slots=FORMATION_SLOTS){const s=slots[index];return {x:center.x+s[0],z:center.z+s[1]};}

// Physical key codes survive Chinese/other keyboard layouts and control focus changes.
export function flightKey(event){
 const code=event.code?.match(/^Key([WASDQERF])$/);
 return code?code[1].toLowerCase():null;
}
export function acceptsFlightInput(target){
 return !target?.isContentEditable&&!['INPUT','TEXTAREA','SELECT'].includes(target?.tagName);
}
export const FORMATIONS={
 a:FORMATION_SLOTS,
 line:[[-10,0],[-5,0],[0,0],[5,0],[10,0]],
 s:[[-6,-9],[-4,0],[0,2],[4,0],[6,9]],
 matrix:[[-5,-5],[5,-5],[0,0],[-5,5],[5,5]]
};
export const PATROL_POINTS=[[0,0],[10,10],[20,20],[30,10],[40,0],[30,-10],[20,-20],[10,-10],[0,0],[-10,10],[-20,20],[-30,10],[-40,0],[-30,-10],[-20,-20],[-10,-10]];
// Catmull-Rom with an arc-length table keeps ground speed constant through curves.
function curvePoint(t){
 const n=PATROL_POINTS.length,i=Math.floor(t)%n,f=t-Math.floor(t),p=[-1,0,1,2].map(k=>PATROL_POINTS[(i+k+n)%n]);
 const component=j=>.5*((2*p[1][j])+(-p[0][j]+p[2][j])*f+(2*p[0][j]-5*p[1][j]+4*p[2][j]-p[3][j])*f*f+(-p[0][j]+3*p[1][j]-3*p[2][j]+p[3][j])*f*f*f);
 return {x:component(0),z:component(1)};
}
const samples=[{...curvePoint(0),distance:0}];
for(let i=1;i<=2048;i++){const p=curvePoint(i*16/2048),prev=samples[i-1];samples.push({...p,distance:prev.distance+Math.hypot(p.x-prev.x,p.z-prev.z)});}
export const PATROL_LENGTH=samples.at(-1).distance;
export function patrolPose(distance){
 const d=((distance%PATROL_LENGTH)+PATROL_LENGTH)%PATROL_LENGTH;
 let lo=0,hi=samples.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(samples[m].distance<d)lo=m;else hi=m;}
 const a=samples[lo],b=samples[hi],f=(d-a.distance)/(b.distance-a.distance);
 return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,height:5.3,yaw:Math.atan2(b.x-a.x,b.z-a.z),progress:d/PATROL_LENGTH};
}
// Match each aircraft to a slot without changing identity. For five aircraft all
// 120 assignments are cheap; prefer paths with the largest horizontal clearance.
export function assignFormation(from,to){
 let best=null,bestScore=-Infinity;
 function visit(order,remaining){
  if(remaining.length){for(const i of remaining)visit([...order,i],remaining.filter(j=>j!==i));return;}
  let clearance=Infinity,cost=0;
  for(let i=0;i<5;i++){
   cost+=Math.hypot(from[i][0]-to[order[i]][0],from[i][1]-to[order[i]][1]);
   for(let j=0;j<i;j++){
    const ax=from[i][0]-from[j][0],az=from[i][1]-from[j][1],bx=to[order[i]][0]-to[order[j]][0]-ax,bz=to[order[i]][1]-to[order[j]][1]-az;
    const t=clamp(-(ax*bx+az*bz)/(bx*bx+bz*bz||1),0,1);
    clearance=Math.min(clearance,Math.hypot(ax+bx*t,az+bz*t));
   }
  }
  const score=Math.min(clearance,4.5)*1000-cost;
  if(score>bestScore){bestScore=score;best=order.map(i=>[...to[i]]);}
 }
 visit([],to.map((_,i)=>i));return best;
}
export function nearestPatrolDistance(point){
 let best=0,error=Infinity;for(const p of samples){const d=(p.x-point.x)**2+(p.z-point.z)**2;if(d<error){error=d;best=p.distance;}}
 return best;
}
