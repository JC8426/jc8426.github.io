import {projects,categories,filterProjects} from './project-data.js';
const lang=()=>document.documentElement.lang.startsWith('zh')?'zh':'en';
const label=(en,zh)=>lang()==='zh'?zh:en;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryName=id=>categories.find(c=>c.id===id)[lang()];
function card(p){return `<article class="project-card"><a href="${p.href}"><div class="project-cover ${p.contain?'is-contain':''}"><img src="assets/portfolio/thumbs/${p.image}" alt="${esc(p.alt)}" width="1024" height="576" loading="lazy" decoding="async"></div><div class="project-card-copy"><span class="project-category">${categoryName(p.category)}</span><h3>${esc(p.title[lang()])}</h3><p>${esc(p.summary[lang()])}</p><div class="project-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div><span class="project-card-link">${label('Open project →','查看项目 →')}</span></div></a></article>`;}
function filters(node,active,onChange){node.innerHTML=categories.map(c=>`<button type="button" data-category="${c.id}" aria-pressed="${c.id===active}">${c[lang()]}</button>`).join('');node.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>onChange(b.dataset.category)));}
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
for(const root of document.querySelectorAll('[data-project-loop]')){
 const track=root.querySelector('[data-project-track]'), filter=root.querySelector('[data-project-filters]'), status=root.querySelector('[data-project-position]');
 const prev=root.querySelector('[data-project-prev]'),next=root.querySelector('[data-project-next]'),play=root.querySelector('[data-project-play]');
 let active='all',playing=false,hovering=false,focused=false,visible=false,timer,scrollFrame;
 function shown(){return [...track.querySelectorAll('.project-card')];}
 function position(){const overflow=track.scrollWidth>track.clientWidth+8;prev.disabled=!overflow;next.disabled=!overflow;play.disabled=reduce.matches||!overflow;const cards=shown(),x=track.scrollLeft;let n=0;cards.forEach((c,i)=>{if(c.offsetLeft-track.offsetLeft<=x+8)n=i;});status.textContent=`${String(n+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;}
 function step(dir){const cards=shown();if(!cards.length)return;const max=track.scrollWidth-track.clientWidth;let target;if(dir>0&&track.scrollLeft>=max-8)target=0;else if(dir<0&&track.scrollLeft<=8)target=max;else target=track.scrollLeft+dir*(cards[0].getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap));track.scrollTo({left:target,behavior:reduce.matches?'instant':'smooth'});}
 function schedule(){clearInterval(timer);if(playing&&!hovering&&!focused&&visible&&!document.hidden&&!reduce.matches&&shown().length>1&&track.scrollWidth>track.clientWidth+8)timer=setInterval(()=>step(1),5500);}
 function updatePlay(){play.textContent=playing?label('Pause loop','暂停轮播'):label('Play loop','播放轮播');play.setAttribute('aria-pressed',String(playing));play.disabled=reduce.matches||track.scrollWidth<=track.clientWidth+8;play.title=reduce.matches?label('Automatic motion is disabled by your system preference','系统已开启减少动态效果，自动轮播已关闭'):'';schedule();}
 function render(){filters(filter,active,id=>{active=id;render();});track.innerHTML=filterProjects('',active).map(card).join('');track.scrollLeft=0;track.setAttribute('aria-label',label('Project cards. Use left and right arrow keys to browse.','项目卡片。可使用左右方向键浏览。'));prev.setAttribute('aria-label',label('Previous projects','上一组项目'));next.setAttribute('aria-label',label('Next projects','下一组项目'));requestAnimationFrame(position);updatePlay();}
 prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));play.addEventListener('click',()=>{playing=!playing;updatePlay();});
 track.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();if(e.key==='Home'||e.key==='End')track.scrollTo({left:e.key==='Home'?0:track.scrollWidth,behavior:reduce.matches?'instant':'smooth'});else step(e.key==='ArrowLeft'?-1:1);}});
 track.addEventListener('pointerdown',()=>{playing=false;updatePlay();},{passive:true});
 track.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(position);},{passive:true});
 root.addEventListener('mouseenter',()=>{hovering=true;schedule();});root.addEventListener('mouseleave',()=>{hovering=false;schedule();});root.addEventListener('focusin',()=>{focused=document.activeElement!==play;schedule();});root.addEventListener('focusout',()=>queueMicrotask(()=>{focused=root.contains(document.activeElement)&&document.activeElement!==play;schedule();}));
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(root);
 window.addEventListener('resize',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(position);});document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',()=>{if(reduce.matches)playing=false;updatePlay();});document.addEventListener('jc-language-changed',render);window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',schedule);render();
}
for(const root of document.querySelectorAll('[data-project-notes]')){
 function render(){root.innerHTML=projects.map((p,i)=>`<a class="project-note" href="${p.href}#${p.noteAnchor}"><span class="project-note-number">${String(i+1).padStart(2,'0')}</span><span><span class="project-note-title">${esc(p.note[lang()])}</span><span class="project-note-category">${esc(p.title[lang()])}</span></span><span aria-hidden="true">↗</span></a>`).join('');}document.addEventListener('jc-language-changed',render);render();
}
for(const root of document.querySelectorAll('[data-project-index]')){
 const input=root.querySelector('input'),grid=root.querySelector('[data-project-results]'),filter=root.querySelector('[data-project-filters]'),count=root.querySelector('[data-project-count]');let active='all';
 function render(){const result=filterProjects(input.value,active);grid.innerHTML=result.length?result.map(card).join(''):`<p class="project-empty">${label('Try another keyword, or browse All work.','没有匹配项目。试试其他关键词，或选择“全部”。')}</p>`;count.textContent=label(`${result.length} projects`,`${result.length} 个项目`);input.placeholder=label('Search ROS, Python, coordination…','搜索 ROS、Python、协作……');filters(filter,active,id=>{active=id;render();});}
 input.addEventListener('input',render);document.addEventListener('jc-language-changed',render);render();
}
