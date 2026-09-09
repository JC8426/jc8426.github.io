// Offline tool: node scripts/compress-hero-textures.mjs /path/to/toktx
// Requires sharp in the local build environment. Does not change runtime deps.
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const encoder=process.argv[2];if(!encoder)throw new Error('Pass an official KTX-Software toktx binary.');
mkdirSync('tmp/hero-texture-build',{recursive:true});
for(const theme of ['desert','lunar'])for(const channel of ['albedo','normal','roughness']){
 const stem=`${theme}-${channel}`,png=`tmp/hero-texture-build/${stem}.png`;
 await sharp(`assets/hero-3d/${stem}.jpg`).png().toFile(png);
 execFileSync(encoder,['--t2','--encode','astc','--astc_blk_d','4x4','--astc_quality','medium','--genmipmap','--lower_left_maps_to_s0t0','--assign_oetf',channel==='albedo'?'srgb':'linear',`assets/hero-3d/${stem}-astc.ktx2`,png],{stdio:'inherit'});
 await sharp(`assets/hero-3d/${stem}.jpg`).resize({width:channel==='albedo'?1024:512}).jpeg({quality:90}).toFile(`assets/hero-3d/${stem}-lite.jpg`);
}
