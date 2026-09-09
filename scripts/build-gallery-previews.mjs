import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {basename} from 'node:path';
import sharp from 'sharp';
let html=readFileSync('index.html','utf8');mkdirSync('assets/taste/thumbs',{recursive:true});
const sources=[...new Set([...html.matchAll(/(?:src|href)="(assets\/taste\/web\/[^"]+)"/g)].map(m=>m[1]))];let number=0;const manifest=[];
for(const original of sources){
 const output=`assets/taste/thumbs/${basename(original).replace(/\.[^.]+$/,'')}.webp`;
 const info=await sharp(original).resize({width:768,height:1024,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toFile(output);number++;
 manifest.push({original,output,width:info.width,height:info.height});
 html=html.replace(new RegExp(`<img src="${original.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"([^>]*)>`,'g'),`<a href="${original}" target="_blank" rel="noopener" aria-label="Open photograph ${String(number).padStart(2,'0')}"><img src="${output}"$1></a>`);
}
writeFileSync('index.html',html);writeFileSync('assets/taste/thumbs/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(`${number} previews; originals retained`);
