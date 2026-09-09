import * as T from 'three';
import {GLTFLoader} from '../vendor/three/GLTFLoader.js';

// Original reference-guided asset, authored offline; not manufacturer CAD.
// One load and shared geometry/materials across every aircraft and LOD.
let asset,loading;
export function loadResearchDroneAsset(){
 if(asset)return Promise.resolve(asset);
 if(!loading)loading=new GLTFLoader().loadAsync(new URL('./drone/research-quad.glb',import.meta.url).href).then(gltf=>{
  asset=gltf.scene;
  asset.traverse(o=>{if(o.isMesh){o.castShadow=!(o.material.transparent&&o.material.opacity<.1);o.receiveShadow=true;
   for(const slot of ['map','normalMap','metalnessMap','roughnessMap'])if(o.material[slot])o.material[slot].anisotropy=4;
  }});
  return asset;
 }).catch(error=>{loading=null;throw error;});
 return loading;
}
export function createResearchDrone(){
 if(!asset)throw new Error('Call and await loadResearchDroneAsset() before creating the drone.');
 const root=new T.Group(),body=new T.LOD();body.name='research-drone-detail';
 body.addLevel(asset.getObjectByName('body-near').clone(true),0);
 body.addLevel(asset.getObjectByName('body-far').clone(true),24,.15);
 root.add(body);
 const rotors=[];
 for(let i=0;i<4;i++){const group=asset.getObjectByName(`rotor-${i}`).clone(true);root.add(group);rotors.push({group,direction:i===0||i===3?1:-1});}
 return {root,rotors};
}
export function unitLabel(text){
 const c=document.createElement('canvas');c.width=256;c.height=80;const x=c.getContext('2d');x.fillStyle='#101711d0';x.roundRect(0,0,256,80,18);x.fill();x.fillStyle='#d6e4c5';x.font='500 40px monospace';x.textAlign='center';x.fillText(text,128,54);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(.85,.265,1);s.position.y=.83;return s;
}

export function clearResearchDroneAsset(){asset=null;loading=null;}
