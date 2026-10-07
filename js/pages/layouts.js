'use strict';
/* =====================================================================
   HOME COMPOSER
   The page recomposes itself. A per-visit seed, the time of day, the
   weekday, your taste profile and an optional mood decide WHICH modules
   appear and in WHICH layout (rail · spotlight · mosaic · ranked rows ·
   numbered · people). Tap the logo to reshuffle; pick a mood to retheme.
   ===================================================================== */
const MOODS=[
  {id:'cozy',n:'Cozy',ic:'heart',g:'35|10751|10749',tg:'35|10751'},
  {id:'laugh',n:'Laugh',ic:'spark',g:'35',tg:'35'},
  {id:'thrill',n:'Thrill',ic:'play',g:'53|28',tg:'10759|80'},
  {id:'mind',n:'Mind-bend',ic:'compass',g:'878|9648',tg:'10765|9648'},
  {id:'cry',n:'Big feels',ic:'heart',g:'18|10749',tg:'18'},
  {id:'awe',n:'Awe',ic:'star',g:'12|14|878',tg:'10765'},
  {id:'dark',n:'Dark',ic:'info',g:'27|80|53',tg:'80|9648'},
  {id:'short',n:'Short',ic:'clock',g:null,tg:null}
];
const HM={mood:LS.get('lumen.mood','auto'),n:LS.get('lumen.visit',0),hiddenAt:0};
const mulberry=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function homeCtx(){
  const d=new Date(),h=d.getHours(),dow=d.getDay();
  return{hour:h,night:h>=22||h<5,morning:h>=5&&h<11,weekend:dow===0||dow===5||dow===6,aff:g=>Math.max(0,U.prof[g]||0)/4,
    word:h>=22||h<5?'Late night':h<11?'Morning':h<17?'Afternoon':(dow===5||dow===6)?'Weekend night':'Tonight'};
}
/* every candidate module: feed id, allowed layouts, weight(context) */
const POOL=[
  {f:'new',L:['rail','mosaic','spotlight'],w:()=>1.3},
  {f:'streaming',L:['rail','spotlight'],w:()=>1.1},
  {f:'gems',L:['rail','mosaic','rows'],w:()=>1.1},
  {f:'quick',L:['rail','mosaic'],w:c=>c.morning?1.7:.8},
  {f:'nowplaying',L:['rail','spotlight'],w:c=>c.weekend?1.9:.9},
  {f:'soon',L:['rail','spotlight'],w:()=>.8},
  {f:'docs',L:['rail','mosaic'],w:c=>.5+c.aff(99)},
  {f:'cult',L:['rail','rows','mosaic'],w:c=>c.night?1.9:.7},
  {f:'anime',L:['rail','spotlight'],w:c=>.5+c.aff(16)*1.5},
  {f:'binge',L:['rail','spotlight'],w:c=>c.weekend?1.9:.8},
  {f:'feelgood',L:['rail','mosaic'],w:c=>c.night?.35:1.4},
  {f:'airing',L:['rail'],w:()=>.7},
  {f:'dec90',L:['rail','rows','mosaic'],w:()=>.9},
  {f:'dec00',L:['rail','rows','mosaic'],w:()=>.9},
  {f:'dec10',L:['rail','mosaic'],w:()=>.8},
  {f:'lang1',L:['rail','spotlight','mosaic'],w:()=>1.1},
  {f:'lang2',L:['rail','mosaic'],w:()=>.9},
  {f:'top250',L:['rows','rail'],w:()=>1.2}
];
function compose(ctx,rnd){
  const seq=[];
  if(HM.mood!=='auto'){
    const k=HM.mood;
    [['movies','spotlight'],['series','rail'],['gems','mosaic'],['classics','rows'],['new','rail']].forEach(([kind,layout])=>seq.push({f:`m:${k}:${kind}`,layout}));
    seq.splice(2,0,{f:'@pers',layout:'pers'});seq.push({f:'top10',layout:'numbered'});
    return seq;
  }
  seq.push({f:'you',layout:rnd()<.5?'spotlight':'rail'},{f:'@pers',layout:'pers'},{f:'trend',layout:'rail'},{f:'top10',layout:'numbered'});
  const picks=POOL.map(m=>({m,s:Math.max(.05,m.w(ctx))*(.55+rnd()*.9)})).sort((a,b)=>b.s-a.s).slice(0,10).map(x=>x.m);
  const used={};let prev='numbered';
  const lay=m=>{
    const opts=m.L.filter(l=>l!==prev&&(used[l]||0)<(l==='rows'?1:l==='mosaic'?2:l==='spotlight'?2:9));
    const l=(opts.length?opts:['rail'])[Math.floor(rnd()*(opts.length||1))];used[l]=(used[l]||0)+1;prev=l;return l;
  };
  const mods=picks.map(m=>({f:m.f,layout:lay(m)}));
  mods.splice(1,0,{f:'@lists',layout:'lists'});
  mods.splice(Math.min(5,mods.length),0,{f:'@people',layout:'people'});
  return [...seq,...mods];
}

/* ---------- layout renderers ---------- */
const spotCard=(it,i)=>`<a class="spotc" href="${href(it)}" data-key="${it.key}" style="--d:${Math.min(i,6)}"><img src="${img(it.bd||it.pp,'w780')}" alt="" loading="lazy" draggable="false"><span class="ov"></span><div class="sl" data-key="${it.key}"><b>${esc(it.title)}</b></div>${qaBtn(it.key)}</a>`;
const rowItem=(it,i,start=1)=>`<a class="lrow" href="${href(it)}" data-key="${it.key}" style="--d:${i}"><span class="rkn">${start+i}</span><img src="${img(it.pp,'w185')}" alt="" loading="lazy" draggable="false"><div><b>${esc(it.title)}</b><small>${it.year||''}${it.vote?` · ★ ${it.vote.toFixed(1)}`:''}</small></div>${qaBtn(it.key)}</a>`;
const LAY={
  rail:{cls:'rail',skel:()=>skelTiles(8),fill:(items,sec)=>items.slice(0,18).map((it,i)=>tile(it,{d:Math.min(i,8),date:sec.dataset.feed==='soon',rank:sec.dataset.feed==='top250'?i+1:0})).join('')},
  numbered:{cls:'rail',skel:()=>skelTiles(6),fill:items=>items.slice(0,10).map((it,i)=>`<div class="t10"><span class="n">${i+1}</span>${tile(it,{d:i})}</div>`).join('')},
  spotlight:{cls:'rail spot',skel:()=>'<div class="spotc sk"></div><div class="spotc sk"></div>',fill:items=>items.slice(0,12).map(spotCard).join('')},
  mosaic:{cls:'mosaic',skel:()=>Array.from({length:5},(_,i)=>`<div class="tile sk ${i?'':'big'}"></div>`).join(''),
    fill:items=>items.slice(0,5).map((it,i)=>tile(it,{d:i}).replace('class="tile','class="tile'+(i?'':' big'))).join('')},
  rows:{cls:'lrows',skel:()=>Array.from({length:6},()=>'<div class="lrow sk"></div>').join(''),fill:(items,sec)=>items.slice(0,6).map((it,i)=>rowItem(it,i)).join('')},
};
function modHTML(m,i){
  const id=m.f;
  if(id==='@pers')return '<div id="persBox"></div>';
  if(id==='@lists')return `<section class="sec" data-mod="lists"><div class="sh"><a class="more" href="#/explore"><h2>Lists${ic('chev')}</h2></a></div><div class="rw"><div class="rail" id="r-lists">${COLLS.slice(0,6).map((c,k)=>coverHTML(c,k)).join('')}</div></div></section>`;
  if(id==='@people')return `<section class="sec" data-mod="people" data-lazy="1"><div class="sh"><h2>People</h2></div><div class="rail ppl" id="r-people"></div></section>`;
  const meta=feedMeta(id),L=LAY[m.layout]||LAY.rail,lz=i>2;
  const more=id==='top10'?'':`<a class="more" href="#/feed/${fid(id)}"><h2>${meta.t}${ic('chev')}</h2></a>`;
  const head=`<div class="sh">${more||`<h2>${meta.t}</h2>`}</div>`;
  const body=`<div class="${L.cls}" data-rail>${L.skel()}</div>`;
  const wrap=(m.layout==='rail'||m.layout==='numbered'||m.layout==='spotlight')?`<div class="rw"><button class="ra l" data-rs="-1" aria-label="Scroll left">${ic('back')}</button>${body}<button class="ra r" data-rs="1" aria-label="Scroll right">${ic('chev')}</button></div>`:body;
  return `<section class="sec" id="sh-${id.replace(/\W/g,'_')}" data-feed="${esc(id)}" data-layout="${m.layout}" ${lz?'data-lazy="1"':''}>${head}${wrap}</section>`;
}
async function fillMod(sec){
  const f=sec.dataset.feed,L=sec.dataset.layout,box=sec.querySelector('[data-rail]');if(!box)return;
  try{
    const r=await (f==='top10'?FP.top10:feedFn(f))(1,'all'),items=r.items;
    if(!items.length||(L==='mosaic'&&items.length<5)||(L==='rows'&&items.length<4)){sec.remove();return}
    box.innerHTML=(LAY[L]||LAY.rail).fill(items,sec);lazy();
    if(L==='spotlight')$$('.sl',box).forEach(logoInto);
    if(f==='you'){const p=$('#fSub');if(p)p.innerHTML=whyLine()}
  }catch{sec.remove()}
}
function lazyMods(){
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;io.unobserve(e.target);
    if(e.target.dataset.mod==='people')fillPeople();else fillMod(e.target)}),{rootMargin:'900px 0px'});
  $$('#mods [data-lazy]').forEach(s=>io.observe(s));
}
async function fillPeople(){
  try{
    const r=await tmdb('/trending/person/week'),box=$('#r-people');if(!box)return;
    box.innerHTML=(r.results||[]).filter(p=>p.profile_path).slice(0,14).map(p=>`<a class="pp" href="#/feed/${fid('p:'+p.id)}"><span class="pph"><img src="${img(p.profile_path,'w185')}" alt="" loading="lazy" draggable="false"></span><b>${esc(p.name)}</b></a>`).join('');lazy();
  }catch{const s=$('[data-mod="people"]');if(s)s.remove()}
}

/* ---------- mounting + evolving ---------- */
function renderMods(animate){
  const box=$('#mods');if(!box)return;
  const d=new Date(),day=Math.floor(d.getTime()/864e5);
  let h=0;for(const c of HM.mood)h=(h*31+c.charCodeAt(0))|0;
  const rnd=mulberry(day*1009+HM.n*7919+h),ctx=homeCtx();
  const seq=compose(ctx,rnd);
  box.innerHTML=seq.map(modHTML).join('');
  if(animate){box.classList.remove('swap');void box.offsetWidth;box.classList.add('swap')}
  $$('#mods [data-feed]:not([data-lazy])').forEach(fillMod);
  renderPersonal();
  if($('#r-lists'))renderLists();
  lazyMods();
  paintMood();
}
function paintMood(){
  const lbl=$('#moodLbl'),bar=$('#moodBar');if(!lbl)return;
  const M=MOODS.find(x=>x.id===HM.mood);
  lbl.textContent=M?M.n:homeCtx().word;
  $$('#moodChips button').forEach(b=>b.classList.toggle('on',b.dataset.mood===HM.mood));
  bar.classList.toggle('set',!!M);
}
function pickMood(id){
  HM.mood=id;LS.set('lumen.mood',id);HM.n++;LS.set('lumen.visit',HM.n);
  renderMods(true);
  $('#moodBar').classList.remove('open');
}
function shuffleHome(){
  HM.n++;LS.set('lumen.visit',HM.n);vib(10);
  const dot=$('.brand i');if(dot){dot.classList.remove('spin');void dot.offsetWidth;dot.classList.add('spin')}
  window.scrollTo({top:0,behavior:'smooth'});
  renderMods(true);toast('Fresh picks','spark');
}
/* the page also drifts on its own: coming back after a while recomposes it */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){HM.hiddenAt=Date.now();return}
  if(HM.hiddenAt&&Date.now()-HM.hiddenAt>15*60*1000&&TAB==='home'&&$('#mods')&&!$('#detail').classList.contains('open')){HM.n++;LS.set('lumen.visit',HM.n);renderMods(true)}
  HM.hiddenAt=0;
});
