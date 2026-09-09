import {loadSurfaceTexture} from './compressed-texture.js';
import {createWorld} from './world.js';
import {createGlacierWorld} from './glacier.js?v=9';
import {disposeGraph} from './resources.mjs';
function geometryInWorker(lunar,signal,recycle){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./world-worker.js',import.meta.url),{type:'module'});
  const abort=()=>{worker.terminate();reject(new DOMException('Terrain superseded','AbortError'));};
  signal.addEventListener('abort',abort,{once:true});
  const finish=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
  worker.onmessage=e=>{finish();e.data.error?reject(new Error(e.data.error)):resolve(e.data.meshes);};
  worker.onerror=e=>{finish();reject(new Error(e.message||'Terrain worker failed'));};
  const transfers=recycle?recycle.flatMap(m=>[...Object.values(m.attributes).map(a=>a.array.buffer),m.index.buffer]):[];
  worker.postMessage({lunar,recycle},transfers);
 });
}
async function loadMaps(lunar,renderer,signal){
 const prefix=lunar?'lunar':'desert',astc=renderer.extensions.has('WEBGL_compressed_texture_astc'),channels=['albedo','normal','roughness'];
 const results=await Promise.allSettled(channels.map(channel=>loadSurfaceTexture(prefix,channel,astc,signal)));
 if(results.some(r=>r.status==='rejected')){for(const r of results)if(r.status==='fulfilled')r.value.dispose();throw new Error('Terrain texture failed to load');}
 return Object.fromEntries(channels.map((c,i)=>[c,results[i].value]));
}
async function buildTerrain(lunar,renderer,signal,recycle){
 if(signal.aborted)throw new DOMException('Terrain superseded','AbortError');
 if(!lunar)return createGlacierWorld();
 const [mapResult,geometryResult]=await Promise.allSettled([loadMaps(lunar,renderer,signal),geometryInWorker(lunar,signal,recycle)]);
 const maps=mapResult.status==='fulfilled'?mapResult.value:null;
 if(signal.aborted||mapResult.status==='rejected'||geometryResult.status==='rejected'){
  if(maps)for(const map of Object.values(maps))map.dispose();
  if(signal.aborted)throw new DOMException('Terrain superseded','AbortError');
  throw (mapResult.reason||geometryResult.reason);
 }
 const loader={load:url=>maps[/-(albedo|normal|roughness)\.jpg$/.exec(url)[1]]};
 try{return createWorld(lunar,loader,Math.min(8,renderer.capabilities.getMaxAnisotropy()),geometryResult.value);}
 catch(error){for(const map of Object.values(maps))map.dispose();throw error;}
}
export {disposeGraph};

// Serialize decoding as well as geometry work. Aborted older requests finish
// cleanup before the newest request starts; rapid theme taps cannot allocate
// several texture sets/whole worlds at once.
let queue=Promise.resolve();
export function loadTerrain(lunar,renderer,signal,recycle){
 const task=queue.then(()=>buildTerrain(lunar,renderer,signal,recycle));
 queue=task.then(()=>undefined,()=>undefined);return task;
}
