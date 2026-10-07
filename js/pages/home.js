'use strict';
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
  box.innerHTML=c.length?`<section class="sec"><div class="sh"><div><h2>Continue Watching</h2></div></div><div class="rw"><div class="rail">${c.map((x,i)=>wide(x.it,x.info,i)).join('')}</div></div></section>`:'';
  lazy();$$('#contBox .meta').forEach(logoInto);
}

/* =====================================================================
   HOME — Apple TV shelves
   ===================================================================== */
const HERO={i:0,items:[]};
const FEEDS=[['you','Top Picks For You'],['trend','Trending Now'],['new','New This Week'],['gems','Hidden Gems'],['quick','Quick Watches'],['soon','Coming Soon'],['anime','Anime Spotlight']];
const SHELF={you:['Made for you',''],trend:['Everyone’s watching',''],new:['Just landed',''],gems:['Loved, rarely talked about','High ratings, small crowds.'],quick:['Under 2 hours','Great films that respect your evening.'],soon:['In theaters & streaming',''],anime:['Subbed & dubbed','']};
const skelTiles=n=>Array.from({length:n},()=>`<div class="tile sk" style="aspect-ratio:2/3;animation:sk 1.4s linear infinite"></div>`).join('');
function shelfHTML(id,title,eyebrow,sub,body,more=true){
  return `<section class="sec" id="sh-${id}"><div class="sh"><div>${eyebrow?`<small>${eyebrow}</small>`:''}${more?`<a class="more" href="#/feed/${id}"><h2>${title}${ic('chev')}</h2></a>`:`<h2>${title}</h2>`}<p id="sub-${id}">${sub||''}</p></div></div>
  <div class="rw"><button class="ra l" data-rs="-1" aria-label="Scroll left">${ic('back')}</button><div class="rail" id="r-${id}">${body}</div><button class="ra r" data-rs="1" aria-label="Scroll right">${ic('chev')}</button></div></section>`;
}
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
  const sh=id=>{const f=FEEDS.find(x=>x[0]===id);return shelfHTML(id,f[1],SHELF[id][0],SHELF[id][1],skelTiles(8))};
  v.innerHTML=`<div class="hero" id="hero">${HERO.items.map(heroSlide).join('')}<div class="hero-nav" id="heroNav">${HERO.items.map((_,i)=>`<i data-i="${i}"><b></b></i>`).join('')}</div></div>
    <div id="contBox"></div><div id="quizBox"></div>
    ${sh('you')}${sh('trend')}
    ${shelfHTML('top10','Top 10 Today','Right now','',skelTiles(6),false)}
    ${sh('new')}
    <section class="sec"><div class="sh"><div><small>Curated</small><a class="more" href="#/explore"><h2>Collections${ic('chev')}</h2></a></div></div><div class="rw"><div class="rail" id="r-colls">${COLLS.slice(0,8).map((c,i)=>coverHTML(c,i)).join('')}</div></div></section>
    ${sh('gems')}${sh('quick')}${sh('soon')}${sh('anime')}`;
  initHero();refreshCont();hideBoot();
  if(needQuiz())showQuiz();
  FEEDS.forEach(([id])=>fillShelf(id));
  fillTop10();fillCovers(COLLS.slice(0,8));
}
async function fillShelf(id){
  try{
    const r=await FP[id](1,'all'),box=$('#r-'+id);if(!box)return;
    const items=r.items.slice(0,id==='you'?20:18);
    if(!items.length){$('#sh-'+id).remove();return}
    box.innerHTML=items.map((it,i)=>tile(it,{d:Math.min(i,8),date:id==='soon'})).join('');lazy();
    if(id==='you'){const p=$('#sub-you');if(p)p.innerHTML=whyLine()}
  }catch{const s=$('#sh-'+id);if(s)s.remove()}
}
async function fillTop10(){
  try{const r=await tmdb('/trending/all/day'),box=$('#r-top10');if(!box)return;
    box.innerHTML=lst(r).slice(0,10).map((it,i)=>`<div class="t10"><span class="n">${i+1}</span>${tile(it,{d:i})}</div>`).join('');lazy()}catch{}
}
const coverHTML=(c,i)=>`<a class="cover" href="#/explore?c=${c.id}" style="--d:${i}"><img alt="" draggable="false" id="cv-${c.id}"><b>${esc(c.n)}</b></a>`;
function fillCovers(list){
  list.forEach(async c=>{try{const r=await collQuery(c),x=(r.results||[]).find(z=>z.backdrop_path),el=$('#cv-'+c.id);if(x&&el){el.src=img(x.backdrop_path,'w780');el.onload=()=>el.classList.add('ld')}}catch{}});
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

/* full feed page (See all) — infinite wall, All / Films / Series */
const FD={id:'you',ty:'all',kill:()=>{}};
function renderFeed(id){
  FD.kill();FD.id=id;
  const f=FEEDS.find(x=>x[0]===id)||FEEDS[0],root=$('#v-feed');
  root.innerHTML=`<a class="back" href="#/">${ic('back')}Home</a><div class="feedhead"><h1 class="h1">${esc(f[1])}</h1></div>
    <div class="seg">${[['all','All'],['movie','Films'],['tv','Series']].map(([k,n])=>`<button class="${FD.ty===k?'on':''}" data-ty="${k}">${n}</button>`).join('')}</div>
    <div class="sub" id="fSub"></div><div id="fWall"></div><div class="sentinel" id="fSent"></div>`;
  const wall=new Wall($('#fWall'));let page=0;
  FD.kill=infinite($('#fSent'),async()=>{
    page++;const r=await FP[id](page,FD.ty);
    if(id==='you'&&page===1)$('#fSub').innerHTML=whyLine();
    if(!r.items.length&&page===1){$('#fWall').innerHTML=`<div class="empty"><b>Nothing here yet</b><p>Try another filter.</p></div>`;return false}
    wall.push(r.items,{date:id==='soon'});return r.more;
  });
}
/* taste starter */
const sigCount=()=>Object.keys(U.seen).length+Object.keys(U.love).length+Object.keys(U.rate).length+Object.keys(U.wl).length+Object.keys(U.eps).length;
const needQuiz=()=>sigCount()<3&&!LS.get('lumen.quiz',0);
async function showQuiz(){
  const box=$('#quizBox');
  try{
    const [a,b]=await Promise.all([tmdb('/trending/movie/week'),tmdb('/movie/top_rated')]);
    const seen=new Set(),items=lst({results:[...b.results.slice(0,8),...a.results.slice(0,8),...b.results.slice(8,14)]},'movie').filter(i=>!seen.has(i.key)&&seen.add(i.key)).slice(0,16);
    if(!box||!box.isConnected)return;
    box.innerHTML=`<div class="quiz"><h3>What do you love?</h3><p>Tap a few. Your picks tune themselves.</p><div class="qrail">${items.map(it=>`<button class="qp" data-q="${it.key}" aria-label="${esc(it.title)}"><img src="${img(it.pp,'w185')}" alt="" loading="lazy"><span class="hrt">${ic('heart')}</span></button>`).join('')}</div>
      <div class="qfoot"><span id="qn">0 picked</span><button class="btn pri sm" id="qdone" disabled>Done</button></div></div>`;
    lazy();
  }catch{}
}
function quizToggle(btn){
  const k=btn.dataset.q;
  if(U.love[k]){delete U.love[k];learn(k,-2);btn.classList.remove('on')}else{U.love[k]=Date.now();learn(k,2);btn.classList.add('on');vib(10)}
  saveU();
  const n=$$('.qp.on').length;$('#qn').textContent=n+' picked';$('#qdone').disabled=n<3;
}
function quizDone(){
  LS.set('lumen.quiz',1);saveU();resetEngine();
  $('#quizBox').innerHTML='';toast('Picks tuned to you','spark');
  const r=$('#r-you');if(r){r.innerHTML=skelTiles(8);fillShelf('you')}
}

