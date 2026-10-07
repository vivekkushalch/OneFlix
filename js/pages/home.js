'use strict';
/* =====================================================================
   HOME — hero + a mood pill + a self-composing stack of modules
   (the composer lives in layouts.js)
   ===================================================================== */
/* ---------- continue watching (logos, not words) ---------- */
function wide(it,info,d=0){
  const pct=info.total?Math.round(info.done/info.total*100):0;
  return `<a class="wide" href="${href(it)}" data-key="${it.key}" style="--d:${d}"><div class="wp"><img src="${img(info.bd||it.bd,'w780')}" alt="" loading="lazy">
    <div class="meta" data-key="${it.key}"><small>S${info.s} E${info.e}</small><b>${esc(it.title)}</b></div>
    <button class="qa" data-ci="${it.key}" aria-label="Check in next episode">${ic('check')}</button><div class="bar"><i style="width:${pct}%"></i></div></div></a>`;
}
async function contInfo(limit=12){
  const keys=Object.keys(U.eps).filter(k=>epCount(k)>0).sort((a,b)=>Math.max(...Object.values(U.eps[b]))-Math.max(...Object.values(U.eps[a]))).slice(0,limit);
  const out=await Promise.all(keys.map(async k=>{
    const m=META[k];if(!m)return null;
    try{const d=await tmdb('/tv/'+m.id),n=nextUp(k,d);if(!n)return null;
      const total=Math.max(d.number_of_episodes||0,1),done=epCount(k);
      return{it:norm(d,'tv'),info:{s:n.s,e:n.e,done,total,left:Math.max(total-done,0),bd:d.backdrop_path}}}catch{return null}
  }));
  return out.filter(Boolean);
}
async function refreshCont(){
  const box=$('#contBox');if(!box)return;
  const c=await contInfo();
  box.innerHTML=c.length?`<section class="sec"><div class="sh"><h2>Continue</h2></div><div class="rw"><div class="rail">${c.map((x,i)=>wide(x.it,x.info,i)).join('')}</div></div></section>`:'';
  lazy();$$('#contBox .meta').forEach(logoInto);
}

/* ---------- classic shelf (used for the shelves built from YOUR list) ---------- */
const HERO={i:0,items:[]};
const skelTiles=n=>Array.from({length:n},()=>`<div class="tile sk" style="aspect-ratio:2/3"></div>`).join('');
const fid=id=>encodeURIComponent(id);
function shelfHTML(id,title,body){
  return `<section class="sec" id="sh-${id.replace(/\W/g,'_')}" data-feed="${esc(id)}"><div class="sh"><a class="more" href="#/feed/${fid(id)}"><h2>${title}${ic('chev')}</h2></a></div>
  <div class="rw"><button class="ra l" data-rs="-1" aria-label="Scroll left">${ic('back')}</button><div class="rail" data-rail>${body}</div><button class="ra r" data-rs="1" aria-label="Scroll right">${ic('chev')}</button></div></section>`;
}
async function fillShelf(id){
  const sec=document.querySelector(`[data-feed="${CSS.escape(id)}"]`);if(!sec)return;
  const box=sec.querySelector('[data-rail]');
  try{
    const r=await feedFn(id)(1,'all'),items=r.items.slice(0,18);
    if(!items.length){sec.remove();return}
    box.innerHTML=items.map((it,i)=>tile(it,{d:Math.min(i,8)})).join('');lazy();
  }catch{sec.remove()}
}

/* ---------- shelves built from YOUR list ---------- */
function personalSeeds(){
  const recent=(o,n)=>Object.keys(o).filter(k=>META[k]).sort((a,b)=>o[b]-o[a]).slice(0,n);
  const lastEp=k=>Math.max(0,...Object.values(U.eps[k]||{}));
  return [...new Set([...recent(U.love,2),...recent(U.wl,3),...recent(U.seen,2),...Object.keys(U.eps).filter(k=>epCount(k)&&META[k]).sort((a,b)=>lastEp(b)-lastEp(a)).slice(0,2)])].slice(0,4);
}
function renderPersonal(){
  const box=$('#persBox');if(!box)return;
  let html='';
  personalSeeds().slice(0,3).forEach(k=>{const m=META[k],verb=U.love[k]?'loved':U.wl[k]?'saved':'watched';
    html+=shelfHTML('bc:'+k,`Because you ${verb} ${esc(m.title)}`,skelTiles(8))});
  topGenres(2).forEach(g=>{if(GN[g])html+=shelfHTML('g:'+g,`More ${GN[g]}`,skelTiles(8))});
  box.innerHTML=html;
  $$('#persBox [data-feed]').forEach(s=>fillShelf(s.dataset.feed));
}

/* ---------- lists (Trakt popular lists when connected, curated otherwise) ---------- */
const listCover=(href_,name,i)=>`<a class="cover lc" href="${href_}" style="--d:${i}"><div class="cm3"><i></i><i></i><i></i></div><b>${esc(name)}</b></a>`;
async function renderLists(){
  const box=$('#r-lists');if(!box)return;
  if(CFG.traktId){
    try{
      const L=(await T.pub('/lists/popular?limit=14')).map(x=>x.list).filter(l=>l.item_count>=6).slice(0,10);
      if(L.length){
        box.innerHTML=L.map((l,i)=>listCover(`#/feed/${fid('trakt:'+l.ids.trakt)}`,l.name,i)).join('');
        L.forEach(async(l,i)=>{try{
          const its=await T.pub(`/lists/${l.ids.trakt}/items/movie,show?limit=3`),st=its.map(x=>x.movie?['movie',x.movie.ids.tmdb]:['tv',x.show.ids.tmdb]).filter(x=>x[1]);
          const ds=await Promise.all(st.map(([t,id])=>tmdb(`/${t}/${id}`).catch(()=>null)));
          const cm=box.children[i]&&box.children[i].querySelector('.cm3');
          if(cm)cm.innerHTML=ds.filter(d=>d&&d.poster_path).map(d=>`<img src="${img(d.poster_path,'w185')}" alt="" onload="this.classList.add('ld')">`).join('')}catch{}});
        return;
      }
    }catch{}
  }
  box.innerHTML=COLLS.slice(0,10).map((c,i)=>coverHTML(c,i)).join('');fillCovers(COLLS.slice(0,10));
}
const coverHTML=(c,i,pre='hv')=>`<a class="cover" href="#/explore?c=${c.id}" style="--d:${i}"><img alt="" draggable="false" id="${pre}-${c.id}"><b>${esc(c.n)}</b></a>`;
function fillCovers(list,pre='hv'){
  const io=new IntersectionObserver(es=>es.forEach(async e=>{
    if(!e.isIntersecting)return;io.unobserve(e.target);
    const c=list.find(x=>pre+'-'+x.id===e.target.id);if(!c)return;
    try{const r=await collQuery(c),x=(r.results||[]).find(z=>z.backdrop_path);if(x){e.target.src=img(x.backdrop_path,'w780');e.target.onload=()=>e.target.classList.add('ld')}}catch{}
  }),{rootMargin:'500px'});
  list.forEach(c=>{const el=document.getElementById(pre+'-'+c.id);if(el)io.observe(el)});
}

/* ---------- page ---------- */
async function renderHome(){
  const v=$('#v-home');
  v.innerHTML=`<div class="hero sk"></div>`;
  let week;
  try{week=await tmdb('/trending/all/week')}catch(e){return v.innerHTML=errorHTML(e)}
  const heroItems=lst(week).filter(i=>i.bd).slice(0,6);
  const det=await Promise.all(heroItems.map(i=>tmdb(`/${i.type}/${i.id}`,{append_to_response:'images,videos',include_image_language:'en,null'}).catch(()=>null)));
  HERO.items=heroItems.map((it,k)=>{const x=det[k]||{};const logo=(x.images&&x.images.logos||[]).filter(l=>l.iso_639_1==='en'||!l.iso_639_1).sort((a,b)=>b.vote_average-a.vote_average)[0];
    return{...it,logo:logo&&logo.file_path,genres:(x.genres||[]).slice(0,2).map(g=>g.name),run:x.runtime||(x.episode_run_time&&x.episode_run_time[0])||0,seasons:x.number_of_seasons||0,tr:ytIds(x.videos&&x.videos.results)}});
  HERO.i=0;
  v.innerHTML=`<div class="hero" id="hero">${HERO.items.map(heroSlide).join('')}<div class="hero-nav" id="heroNav">${HERO.items.map((_,i)=>`<i data-i="${i}"><b></b></i>`).join('')}</div></div>
    <div class="moodbar" id="moodBar"><button class="mood-pill" id="moodPill" aria-label="Pick a mood">${ic('spark')}<span id="moodLbl"></span>${ic('chev')}</button>
      <div class="mood-chips" id="moodChips"><button data-mood="auto">Auto</button>${MOODS.map(m=>`<button data-mood="${m.id}">${m.n}</button>`).join('')}</div></div>
    <div id="contBox"></div><div id="quizBox"></div><div id="mods"></div><div style="height:30px"></div>`;
  initHero();refreshCont();hideBoot();
  if(needQuiz())showQuiz();
  renderMods(false);
}
function heroSlide(it,i){
  const meta=[...it.genres,it.year,it.run?fmtRun(it.run):(it.seasons?`${it.seasons} season${it.seasons>1?'s':''}`:'')].filter(Boolean);
  return `<article class="hs ${i?'':'on'}" data-i="${i}">
    <img class="bd" src="${img(it.bd,'w1280')}" alt="" ${i?'loading="lazy"':'fetchpriority="high"'}>
    <img class="po" src="${img(it.pp,'w780')}" alt="" ${i?'loading="lazy"':'fetchpriority="high"'}>
    <div class="hs-c">
      <div class="hs-meta">${meta.map((m,k)=>(k?'<i class="dot"></i>':'')+`<span>${esc(m)}</span>`).join('')}</div>
      ${it.logo?`<img class="hs-logo" src="${img(it.logo,'w500')}" alt="${esc(it.title)}">`:`<h1 class="hs-title">${esc(it.title)}</h1>`}
      <p class="hs-ov">${esc(it.ov)}</p>
      <div class="btns">${it.tr.length?`<button class="btn pri" data-hero-tr="${i}">${ic('play')}Trailer</button>`:''}
        <a class="btn sq" href="${href(it)}" aria-label="Details">${ic('info')}</a>
        <button class="btn sq ${inWL(it.key)?'on':''}" data-wl="${it.key}" data-s="${inWL(it.key)?1:0}" aria-label="Save">${ic(inWL(it.key)?'check':'plus')}</button></div>
    </div></article>`;
}
function initHero(){
  const hero=$('#hero');if(!hero)return;
  const slides=$$('.hs',hero),bars=$$('#heroNav i',hero);
  const show=i=>{
    HERO.i=(i+slides.length)%slides.length;
    slides.forEach((s,k)=>s.classList.toggle('on',k===HERO.i));
    bars.forEach((b,k)=>{b.classList.toggle('done',k<HERO.i);b.classList.remove('on')});
    void hero.offsetWidth;bars[HERO.i].classList.add('on');
  };
  bars.forEach((b,k)=>{b.addEventListener('click',()=>show(k));b.querySelector('b').addEventListener('animationend',()=>show(HERO.i+1))});
  let x0=null;
  hero.addEventListener('pointerdown',e=>{x0=e.clientX});
  hero.addEventListener('pointerup',e=>{if(x0==null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>50)show(HERO.i+(dx<0?1:-1))});
  hero.addEventListener('mouseenter',()=>hero.classList.add('paused'));
  hero.addEventListener('mouseleave',()=>hero.classList.remove('paused'));
  show(0);
}
document.addEventListener('visibilitychange',()=>{const h=$('#hero');if(h)h.classList.toggle('paused',document.hidden)});

/* ---------- full feed page (See all) ---------- */
const FD={id:'you',ty:'all',kill:()=>{}};
function renderFeed(id){
  FD.kill();FD.id=id;
  const f=feedMeta(id),root=$('#v-feed'),ranked=id==='top250'||id.startsWith('trakt:'),plain=id.startsWith('trakt:')||id.startsWith('p:');
  root.innerHTML=`<a class="back" href="#/">${ic('back')}</a><div class="feedhead"><h1 class="h1" id="fTitle">${esc(f.t)}</h1></div><p class="fdesc" id="fDesc"></p>
    ${plain?'':`<div class="seg">${[['all','All'],['movie','Films'],['tv','Series']].map(([k,n])=>`<button class="${FD.ty===k?'on':''}" data-ty="${k}">${n}</button>`).join('')}</div>`}
    <div id="fWall"></div><div class="sentinel" id="fSent"></div>`;
  const wall=new Wall($('#fWall'));let page=0,count=0;const fn=feedFn(id);
  FD.kill=infinite($('#fSent'),async()=>{
    page++;const r=await fn(page,FD.ty);
    if(r.title&&$('#fTitle'))$('#fTitle').textContent=r.title;
    if(r.desc&&$('#fDesc'))$('#fDesc').textContent=r.desc.replace(/<[^>]+>/g,'').slice(0,240);
    if(!r.items.length&&page===1){$('#fWall').innerHTML=`<div class="empty"><b>Nothing here yet</b><p>Try another filter.</p></div>`;return false}
    wall.push(r.items,{date:id==='soon',rank:ranked?count:-1});count+=r.items.length;return r.more;
  });
}

/* ---------- taste starter ---------- */
const sigCount=()=>Object.keys(U.seen).length+Object.keys(U.love).length+Object.keys(U.rate).length+Object.keys(U.wl).length+Object.keys(U.eps).length;
const needQuiz=()=>sigCount()<3&&!LS.get('lumen.quiz',0);
async function showQuiz(){
  const box=$('#quizBox');
  try{
    const [a,b]=await Promise.all([tmdb('/trending/movie/week'),tmdb('/movie/top_rated')]);
    const seen=new Set(),items=lst({results:[...b.results.slice(0,8),...a.results.slice(0,8),...b.results.slice(8,14)]},'movie').filter(i=>!seen.has(i.key)&&seen.add(i.key)).slice(0,16);
    if(!box||!box.isConnected)return;
    box.innerHTML=`<div class="quiz"><h3>What do you love?</h3><div class="qrail">${items.map(it=>`<button class="qp" data-q="${it.key}" aria-label="${esc(it.title)}"><img src="${img(it.pp,'w185')}" alt="" loading="lazy"><span class="hrt">${ic('heart')}</span></button>`).join('')}</div>
      <div class="qfoot"><span id="qn">Tap a few</span><button class="btn pri sm" id="qdone" disabled>Done</button></div></div>`;
    lazy();
  }catch{}
}
function quizToggle(btn){
  const k=btn.dataset.q;
  if(U.love[k]){delete U.love[k];learn(k,-2);btn.classList.remove('on')}else{U.love[k]=Date.now();learn(k,2);btn.classList.add('on');vib(10)}
  saveU();
  const n=$$('.qp.on').length;$('#qn').textContent=n?n+' picked':'Tap a few';$('#qdone').disabled=n<3;
}
function quizDone(){
  LS.set('lumen.quiz',1);saveU();resetEngine();
  $('#quizBox').innerHTML='';toast('Tuned to you','spark');
  renderMods(true);
}
