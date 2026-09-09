// Opt-in art/QA bench. No inspector code is downloaded on the normal homepage.
export function installInspection({T,hero,scene,world,camera,controls,units,renderer,render,query,floor}){
 document.documentElement.classList.add('hero-inspection');
 const style=document.createElement('style');style.textContent='.hero-inspection .nav,.hero-inspection .hero-content,.hero-inspection .flight-telemetry,.hero-inspection .scene-toolbar,.hero-inspection .fleet-dock,.hero-inspection .scene-help{display:none!important}.hero-inspection .hero{height:100vh;min-height:100vh}.hero-inspection .hero::before,.hero-inspection .hero::after{display:none!important}.hero-inspection body{overflow:hidden}';document.head.append(style);
 const panel=document.createElement('div');panel.style.cssText='position:fixed;top:12px;left:12px;z-index:100;display:flex;gap:10px;background:#09121bcc;color:#fff;padding:12px;border-radius:8px;font:12px monospace';
 panel.innerHTML='<label>Shot <select aria-label="Inspection shot"><option value="wide">Wide fleet</option><option value="low">Terrain low angle</option><option value="close">Aircraft close-up</option></select></label><label>Surface <select aria-label="Inspection surface"><option value="full">Full material</option><option value="gray">Gray clay</option><option value="normal">Geometry normals</option><option value="no-shadow">No shadows</option><option value="no-normal">No normal map</option></select></label>';
 document.body.append(panel);
 const originals=new Map();world.traverse(o=>{if(o.isMesh)originals.set(o,o.material);});
 const noNormals=new Map();for(const m of originals.values()){if(noNormals.has(m))continue;const copy=m.clone();copy.normalMap=null;copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=()=>m.customProgramCacheKey()+'-no-normal';noNormals.set(m,copy);}
 const gray=new T.MeshStandardMaterial({color:'#969696',roughness:1}),normal=new T.MeshNormalMaterial();
 const shotSelect=panel.querySelector('[aria-label="Inspection shot"]'),surfaceSelect=panel.querySelector('[aria-label="Inspection surface"]');
 function frame(){
  const shot=shotSelect.value,p=units[0].root.position;
  for(const u of units){u.root.visible=shot!=='close'||u===units[0];u.marker.visible=false;u.label.visible=false;}
  if(shot==='close'){camera.position.set(p.x+3.2,p.y+1.1,p.z+4.4);controls.target.set(p.x,p.y+.05,p.z);}
  else if(shot==='low'){camera.position.set(-21,floor(-21,18)+1.6,18);controls.target.set(1,floor(1,-15)+1,-15);}
  else{camera.position.set(28,floor(0,0)+25,52);controls.target.set(0,floor(0,0)+3,0);}
  camera.lookAt(controls.target);camera.updateProjectionMatrix();
  for(const [o,m] of originals)o.material=surfaceSelect.value==='gray'?gray:surfaceSelect.value==='normal'?normal:surfaceSelect.value==='no-normal'?noNormals.get(m):m;
  renderer.shadowMap.enabled=surfaceSelect.value!=='no-shadow';scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});
  hero.dataset.inspectShot=shot;hero.dataset.inspectSurface=surfaceSelect.value;render();
 }
 shotSelect.value=['wide','low','close'].includes(query.get('shot'))?query.get('shot'):'wide';
 surfaceSelect.value=['gray','normal','no-shadow','no-normal'].includes(query.get('surface'))?query.get('surface'):'full';
 shotSelect.addEventListener('change',frame);surfaceSelect.addEventListener('change',frame);frame();
}
