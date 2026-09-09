// Dispose an owned resource graph once, despite shared materials and textures.
export function disposeGraph(root){
 if(!root)return;
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(o=>{if(o.userData?.dispose){const dispose=o.userData.dispose;delete o.userData.dispose;dispose();}if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean)){materials.add(m);for(const t of Object.values(m))if(t?.isTexture)textures.add(t);}});
 for(const g of geometries)g.dispose();
 for(const t of textures){t.dispose();t.image?.close?.();}
 for(const m of materials)m.dispose();
 root.removeFromParent?.();root.clear?.();
}
export function textureBytes(texture){
 if(texture.isCompressedTexture)return texture.mipmaps.reduce((n,m)=>n+(m.data?.byteLength||0),0);
 const image=texture.image;return image?.width&&image?.height?image.width*image.height*4*(texture.generateMipmaps?4/3:1):0;
}
// Bounds determine a steep, readable waypoint selection view. Camera and
// terrain coordinates are scene metres; fitting also works in portrait.
export function waypointFrame(center,goal,aspect=1){
 const target=goal?{x:(center.x+goal.x)/2,z:(center.z+goal.z)/2}:{...center};
 const radius=goal?Math.hypot(goal.x-center.x,goal.z-center.z)/2+12:22;
 const verticalFov=40*Math.PI/180;
 const fov=Math.min(verticalFov,2*Math.atan(Math.tan(verticalFov/2)*Math.max(.4,aspect)));
 const distance=Math.max(52,radius/Math.sin(fov/2));
 return {target,height:distance*.83,back:distance*.56};
}
