// Pure simulation helpers; no DOM/WebGL dependency. Units are illustrative.
export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function manualStep(position,heading,input,dt,speed,floor,limit=90){
 const turn=input.yaw||0,yaw=heading+turn*dt*.85;
 const f=input.forward||0,s=input.side||0,m=Math.max(1,Math.hypot(f,s));
 const x=clamp(position.x+(Math.sin(yaw)*f+Math.cos(yaw)*s)/m*speed*dt,-limit,limit);
 const z=clamp(position.z+(Math.cos(yaw)*f-Math.sin(yaw)*s)/m*speed*dt,-limit,limit);
 const y=clamp(position.y+(input.up||0)*speed*.6*dt,floor(x,z)+1.25,18);
 return {x,y,z,yaw};
}
export function automaticPose(index,time){
 const phase=time*.055,slots=[[0,0],[-4,-4],[4,-4],[-8,-8],[8,-8]],slot=slots[index];
 return {x:Math.sin(phase)*6+slot[0],z:Math.sin(phase*.7)*4+slot[1],height:4.3+Math.sin(time*.55+index)*.16,yaw:Math.sin(phase)*.28};
}
