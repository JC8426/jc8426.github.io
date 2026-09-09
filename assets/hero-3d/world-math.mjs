const lerp=(a,b,t)=>(1-t)*a+t*b;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*t*(t*(t*6-15)+10);
function hash(x,z){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);}
function noise(x,z){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);return lerp(lerp(hash(ix,iz),hash(ix+1,iz),fx),lerp(hash(ix,iz+1),hash(ix+1,iz+1),fx),fz);}
export function fbm(x,z){let v=0,a=.5;for(let i=0;i<4;i++){v+=a*noise(x,z);a*=.5;x=x*2.03+7;z=z*2.01-9;}return v;}
const craters=[
 {x:-25,z:-24,r:15,age:.75},{x:30,z:-37,r:12,age:.45},{x:-43,z:21,r:8,age:.6},
 ...Array.from({length:68},(_,i)=>({x:(hash(i,2)-.5)*970,z:(hash(i,8)-.5)*970,r:7+hash(i,4)**2*48,age:hash(i,6)})),
 ...Array.from({length:14},(_,i)=>({x:(hash(i,12)-.5)*240,z:(hash(i,18)-.5)*240,r:2.4+hash(i,14)*5,age:hash(i,16)})),
];
// Near ridges frame the patrol; high, distant dune chains shape the horizon.
const desertRidges=[
 {u:25,v:-90,height:10,width:26,length:72,phase:.4},
 {u:-18,v:94,height:9,width:25,length:65,phase:2.4},
 {u:-88,v:-12,height:25,width:31,length:190,phase:1.3},
 {u:-198,v:-75,height:48,width:46,length:260,phase:.1},
 {u:-325,v:150,height:59,width:48,length:310,phase:2.6},
 {u:145,v:65,height:36,width:38,length:255,phase:3.2},
 {u:300,v:-85,height:58,width:52,length:310,phase:1.6},
];
export function groundHeight(x,z,lunar){
 if(!lunar){
  // Broad asymmetric dune ridges provide real silhouettes and slip faces.
  // Their crests meander and taper rather than repeating as a sine-wave sheet.
  const u=z+x*.16,v=x-z*.16;
  let h=(fbm(x*.013,z*.013)-.45)*2.2;
  for(const d of desertRidges){
   const along=(v-d.v)/d.length;
   if(Math.abs(along)>2.8)continue;
   const crest=d.u+Math.sin(v*.013+d.phase)*12+Math.sin(v*.029+d.phase)*3;
   const cross=u-crest;
   const width=d.width*1.5*(1+.22*Math.tanh(cross/14));
   h+=d.height*Math.exp(-((cross/width)**2))*Math.exp(-(along**4)*.7);
  }
  return h+(fbm(x*.045,z*.045)-.45)*.13;
 }
 let h=(fbm(x*.007,z*.007)-.45)*8+(fbm(x*.035,z*.035)-.45)*.48;
 for(const c of craters){
  const dx=x-c.x,dz=z-c.z;if(Math.abs(dx)>c.r*1.8||Math.abs(dz)>c.r*1.8)continue;
  const angle=Math.atan2(dz,dx),radius=c.r*(1+.025*Math.sin(angle*3+c.x)+.014*Math.cos(angle*7+c.z));
  const q=Math.hypot(dx,dz)/radius;if(q>=1.8)continue;
  const bowl=q<1?-.16*c.r*(1-q*q)**2:0;
  const rim=.028*c.r*(1-c.age*.35)*Math.exp(-(((q-.98)/(.20+c.age*.12))**2));
  // Smoothly taper ejecta to zero: overlapping craters never introduce a step.
  const taper=1-smooth(clamp((q-1.35)/.45,0,1));
  h+=(bowl+rim)*taper;
 }
 return h;
}
