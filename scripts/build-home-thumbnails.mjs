// Homepage cards do not need full-resolution case-study images in memory.
// Originals remain unchanged and continue to serve detailed case studies.
import sharp from 'sharp';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {basename} from 'node:path';
const originals=['assets/data-analysis/archive-composition.png','assets/portfolio/uav-simulation-rviz-gazebo-9117.jpg','assets/rcap-2026/team-and-robots.jpg','assets/portfolio/lab-coordinate-room-1129.jpg','assets/portfolio/agenthub-product-render.png','assets/portfolio/personal-dashboard.png','assets/portfolio/volary-main.png','assets/portfolio/ai-agriculture.webp','assets/portfolio/search_and_rescue-1024x576.jpg'];
mkdirSync('assets/portfolio/thumbs',{recursive:true});const manifest=[];let html=readFileSync('index.html','utf8');
for(const original of originals){
 const output=`assets/portfolio/thumbs/${basename(original).replace(/\.[^.]+$/,'')}-1024.webp`;
 const info=await sharp(original).resize({width:1024,height:768,fit:'inside',withoutEnlargement:true}).webp({quality:90,effort:5}).toFile(output);
 manifest.push({original,output,width:info.width,height:info.height,decodedBytes:info.width*info.height*4});
 html=html.replaceAll(`src="${original}"`,`src="${output}"`);
}
writeFileSync('index.html',html);writeFileSync('assets/portfolio/thumbs/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(manifest);
