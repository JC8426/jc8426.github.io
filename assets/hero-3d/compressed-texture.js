import * as T from '../vendor/three/three.module.js';
// The offline pipeline writes ASTC 4x4 KTX2 without supercompression. Upload
// those blocks directly on supported GPUs: no runtime WASM transcoder/heap.
export function parseAstc(buffer){
 const view=new DataView(buffer),signature=[0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a];
 if(buffer.byteLength<104||signature.some((v,i)=>view.getUint8(i)!==v))throw new Error('Invalid KTX2 header');
 const format=view.getUint32(12,true),width=view.getUint32(20,true),height=view.getUint32(24,true),levels=view.getUint32(40,true);
 if(![157,158].includes(format)||!width||!height||view.getUint32(28,true)!==0||view.getUint32(32,true)!==0||view.getUint32(36,true)!==1||view.getUint32(44,true)!==0||levels<1||80+levels*24>buffer.byteLength)throw new Error('Unsupported KTX2 layout');
 const mipmaps=[];
 for(let i=0;i<levels;i++){
  const offset=Number(view.getBigUint64(80+i*24,true)),length=Number(view.getBigUint64(88+i*24,true)),w=Math.max(1,width>>i),h=Math.max(1,height>>i);
  if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<80+levels*24||offset+length>buffer.byteLength||length!==Math.ceil(w/4)*Math.ceil(h/4)*16)throw new Error('Invalid ASTC mip range');
  mipmaps.push({data:new Uint8Array(buffer,offset,length),width:w,height:h});
 }
 const texture=new T.CompressedTexture(mipmaps,width,height,T.RGBA_ASTC_4x4_Format,T.UnsignedByteType);
 texture.colorSpace=format===158?T.SRGBColorSpace:T.NoColorSpace;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
}
export async function loadSurfaceTexture(prefix,channel,astc,signal){
 if(astc){
  const response=await fetch(new URL(`./${prefix}-${channel}-astc.ktx2`,import.meta.url),{signal});
  if(!response.ok)throw new Error(`Terrain texture HTTP ${response.status}`);
  return parseAstc(await response.arrayBuffer());
 }
 // Non-ASTC devices use modest native-decoded maps to retain the memory cap.
 return new T.TextureLoader().loadAsync(new URL(`./${prefix}-${channel}-lite.jpg`,import.meta.url).href);
}
