'use strict';
/* =====================================================================
   LUMEN UI — mobile-first. Needs icons.js, core.js, sheet.js
   Home = a wall + feed tabs · Discover = full-screen reel that learns
   ===================================================================== */
const href=it=>`#/${it.type==='tv'?'t':'m'}/${it.id}`;
const vib=n=>{try{navigator.vibrate&&navigator.vibrate(n)}catch{}};
const GN={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western',10759:'Action',10765:'Sci-Fi',10768:'War'};
const GENRE_POOL=[28,12,16,35,80,99,18,14,27,9648,10749,878,53,37];

/* ---------- save button (animated) ---------- */
const qaBtn=key=>{const on=inWL(key);return `<button class="qa ${on?'on':''}" data-wl="${key}" data-s="${on?1:0}" aria-label="Save">${ic(on?'check':'plus')}</button>`};
function paintSave(b,on,anim){
  b.dataset.s=on?1:0;
  if(b.classList.contains('qa')||b.classList.contains('btn'))b.classList.toggle('on',on);
  const bm=b.dataset.ico==='bm';
  b.innerHTML=bm?ic('bookmark',on?'solid pop':''):ic(on?'check':'plus',on&&anim?'draw':'');
  if(anim){b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),650)}
}
function paintLove(b,on,anim){b.classList.toggle('on',on);b.innerHTML=ic('heart',on?'solid '+(anim?'pop':''):'')}
function syncUI(){
  $$('[data-wl]').forEach(b=>{const on=inWL(b.dataset.wl);if(b.dataset.s===undefined||(+b.dataset.s===1)!==on)paintSave(b,on,b.dataset.s!==undefined)});
  $$('[data-love]').forEach(b=>{const on=!!U.love[b.dataset.love];if(b.classList.contains('on')!==on)paintLove(b,on,true)});
  if(D.key&&D.data)paintActions();
  if(TAB==='library')renderLibrary();
  if(TAB==='home')refreshCont();
}

/* ---------- tiles + the wall (shortest-column masonry, no layout jumps) ---------- */
function tile(it,o={}){
  const bd=o.kind==='bd'&&it.bd,src=bd?img(it.bd,'w500'):img(it.pp,'w342');
  let tag='';if(o.date&&it.date){const d=new Date(it.date+'T12:00:00');tag=`<span class="tag">${d.toLocaleString('en-US',{month:'short'})} ${d.getDate()}</span>`}
  return `<a class="tile ${bd?'bdk':''}" href="${href(it)}" data-key="${it.key}" style="aspect-ratio:${bd?'16/9':'2/3'};--d:${o.d||0}" aria-label="${esc(it.title)}">${src?`<img src="${src}" alt="" loading="lazy" decoding="async" draggable="false">`:`<span class="nop">${esc(it.title)}</span>`}<span class="ov"></span><span class="tt">${esc(it.title)}<small>${it.year||''}</small></span>${tag}${qaBtn(it.key)}</a>`;
}
async function logoInto(el){
  const m=META[el.dataset.key];if(!m)return;const p=await logoOf(m);if(!p||!el.isConnected)return;
  const i=new Image();i.className='lg';i.alt='';i.draggable=false;i.src=img(p,'w300');
  i.onload=()=>{el.appendChild(i);el.classList.add('hasl');requestAnimationFrame(()=>i.classList.add('ld'))};
}
class Wall{
  constructor(root){
    this.root=root;this.list=[];this.n=0;root.classList.add('wall');
    this.io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){this.io.unobserve(e.target);logoInto(e.target)}}),{rootMargin:'240px'});
    this.build();
    this.rs=()=>{clearTimeout(this.t);this.t=setTimeout(()=>{if(!root.isConnected)return removeEventListener('resize',this.rs);this.build(true)},220)};
    addEventListener('resize',this.rs);
  }
  colsFor(){const w=this.root.clientWidth||innerWidth;return clamp(Math.round(w/(innerWidth<700?172:210)),2,7)}
  build(re){
    const n=this.colsFor();if(re&&n===this.n)return;this.n=n;
    this.root.innerHTML=Array.from({length:n},()=>'<div class="col"></div>').join('');
    this.cols=$$('.col',this.root);this.hs=Array(n).fill(0);this.place(this.list,false);lazy();
  }
  place(es,anim){
    es.forEach(e=>{
      let k=0;for(let i=1;i<this.n;i++)if(this.hs[i]<this.hs[k])k=i;
      this.cols[k].insertAdjacentHTML('beforeend',tile(e.it,e));
      const el=this.cols[k].lastElementChild;if(!anim)el.style.animation='none';
      this.hs[k]+=e.kind==='bd'?.5625:1.5;
      if(e.kind==='bd')this.io.observe(el);
    });
  }
  push(items,o={}){
    const base=this.list.length,es=items.map((it,i)=>({it,kind:it.bd&&(base+i)%6===4?'bd':'po',date:o.date,d:Math.min(i,10)}));
    this.list.push(...es);this.place(es,true);lazy();
  }
  clear(){this.list=[];this.build()}
}
function ink(tabs){
  let k=tabs.querySelector('.ink');if(!k){k=document.createElement('i');k.className='ink';tabs.appendChild(k)}
  const b=tabs.querySelector('button.on:not(.sm)');
  if(!b){k.style.setProperty('--w','0px');return}
  k.style.setProperty('--x',b.offsetLeft+'px');k.style.setProperty('--w',b.offsetWidth+'px');
  b.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
}
function infinite(sent,load){
  let busy=false,done=false;
  sent.className='sentinel load';
  const io=new IntersectionObserver(async es=>{
    if(!es[0].isIntersecting||busy||done)return;busy=true;
    try{done=(await load())===false}catch{done=true}
    busy=false;lazy();
    if(done){sent.className='sentinel';sent.textContent=''}else{io.unobserve(sent);io.observe(sent)}
  },{rootMargin:'1000px'});
  io.observe(sent);return()=>io.disconnect();
}

/* ---------- recommendation engine: evolves with every tap ---------- */
const ENG={pool:new Map(),served:new Set(),page:0,why:''};
const ownedKeys=()=>new Set([...Object.keys(U.seen),...Object.keys(U.love),...Object.keys(U.rate),...Object.keys(U.wl),...Object.keys(U.skip),...Object.keys(U.eps).filter(k=>epCount(k))]);
function addPool(it,base){
  if(!it||!it.pp)return;const o=ENG.pool.get(it.key);
  if(o)o.base=Math.max(o.base,base)+.18;else ENG.pool.set(it.key,{it,base});
}
async function seedRecs(){
  const by=o=>Object.keys(o).sort((a,b)=>o[b]-o[a]);
  const lastEp=k=>Math.max(0,...Object.values(U.eps[k]||{}));
  const seeds=[...new Set([...Object.keys(U.love),...Object.keys(U.rate).filter(k=>U.rate[k]>=8),...by(U.seen).slice(0,5),...Object.keys(U.eps).filter(k=>epCount(k)).sort((a,b)=>lastEp(b)-lastEp(a)).slice(0,4),...by(U.wl).slice(0,4)])].filter(k=>META[k]).slice(0,9);
  ENG.why=seeds.length?seeds.slice(0,3).map(k=>META[k].title):[];
  await Promise.all(seeds.map(async k=>{
    const m=META[k];
    const [a,b]=await Promise.all([tmdb(`/${m.type}/${m.id}/recommendations`).catch(()=>({results:[]})),tmdb(`/${m.type}/${m.id}/similar`).catch(()=>({results:[]}))]);
    [...a.results.slice(0,20),...b.results.slice(0,8)].forEach((r,i)=>addPool(norm(r,m.type),2.2-Math.min(i,24)*.035));
  }));
  if(T.on){
    try{
      const [m,s]=await Promise.all([T.req('/recommendations/movies?limit=14&ignore_collected=true'),T.req('/recommendations/shows?limit=14&ignore_collected=true')]);
      const ids=[];for(let i=0;i<14;i++){if(m[i])ids.push(['movie',m[i].ids.tmdb]);if(s[i])ids.push(['tv',s[i].ids.tmdb])}
      (await Promise.all(ids.filter(x=>x[1]).map(([t,id])=>tmdb(`/${t}/${id}`).then(d=>norm(d,t)).catch(()=>null)))).forEach(it=>addPool(it,2.8));
    }catch{}
  }
}
async function engineFill(){
  const n=++ENG.page,tg=topGenres(3),rg=GENRE_POOL.filter(g=>!tg.includes(g))[Math.floor(Math.random()*(GENRE_POOL.length-tg.length))];
  const jobs=[];
  if(n===1)jobs.push(seedRecs());
  if(tg.length){
    const gs=tg.slice(0,2).join('|');
    jobs.push(tmdb('/discover/movie',{with_genres:gs,sort_by:'popularity.desc','vote_average.gte':6.8,'vote_count.gte':300,page:n}).then(r=>lst(r,'movie').forEach(it=>addPool(it,1.6))).catch(()=>{}));
    jobs.push(tmdb('/discover/tv',{with_genres:gs,sort_by:'popularity.desc','vote_average.gte':7,'vote_count.gte':150,page:n}).then(r=>lst(r,'tv').forEach(it=>addPool(it,1.5))).catch(()=>{}));
  }
  jobs.push(tmdb('/discover/movie',{with_genres:rg,sort_by:'popularity.desc','vote_average.gte':7.2,'vote_count.gte':1200,'primary_release_date.gte':'1995-01-01',page:n}).then(r=>lst(r,'movie').forEach(it=>addPool(it,1.1))).catch(()=>{}));   // exploration
  jobs.push(tmdb('/trending/all/week',{page:n}).then(r=>lst(r).forEach(it=>addPool(it,1.5))).catch(()=>{}));
  await Promise.all(jobs);
}
async function engineTake(count,ty='all'){
  const own=ownedKeys();
  const avail=()=>[...ENG.pool.values()].filter(o=>!ENG.served.has(o.it.key)&&!own.has(o.it.key)&&(ty==='all'||o.it.type===ty)&&affinity(o.it)>-1.6);
  let a=avail(),g=0;
  while(a.length<count&&g++<4){await engineFill();a=avail()}
  const sc=o=>o.base+affinity(o.it)*.3+(o.it.vote||0)/22+Math.random()*.45;
  const out=a.map(o=>({o,s:sc(o)})).sort((x,y)=>y.s-x.s).slice(0,count).map(x=>x.o.it);
  out.forEach(it=>ENG.served.add(it.key));
  return out;
}
const resetEngine=()=>{ENG.pool.clear();ENG.served.clear();ENG.page=0;ENG.why=''};
function whyLine(){
  const tg=topGenres(2).map(g=>GN[g]).filter(Boolean);
  if(Array.isArray(ENG.why)&&ENG.why.length)return `Because you liked <b>${ENG.why.map(esc).join('</b>, <b>')}</b>`;
  if(tg.length)return `Tuned to <b>${tg.join('</b> · <b>')}</b>`;
  return `Love a few titles and this feed learns your taste`;
}

/* ---------- home feeds ---------- */
async function disc(ty,pm,pt,page){
  const types=[ty!=='tv'&&'movie',ty!=='movie'&&'tv'].filter(Boolean);
  const rs=await Promise.all(types.map(t=>tmdb('/discover/'+t,{...(t==='movie'?pm:pt),page})));
  const ls=rs.map((r,i)=>lst(r,types[i])),out=[];
  for(let i=0;i<Math.max(...ls.map(l=>l.length));i++)ls.forEach(l=>l[i]&&out.push(l[i]));
  return{items:out,more:page<Math.min(8,...rs.map(r=>r.total_pages))};
}
const FP={
  you:async(p,ty)=>({items:await engineTake(18,ty),more:true}),
  trend:async(p,ty)=>{const r=await tmdb(`/trending/${ty}/week`,{page:p});return{items:lst(r,ty==='all'?undefined:ty),more:p<Math.min(r.total_pages,10)}},
  new:(p,ty)=>disc(ty,{sort_by:'popularity.desc','primary_release_date.gte':iso(-30),'primary_release_date.lte':iso(0),region:CFG.region,with_release_type:'2|3'},{sort_by:'popularity.desc','first_air_date.gte':iso(-30),'first_air_date.lte':iso(0)},p),
  gems:(p,ty)=>disc(ty,{sort_by:'vote_average.desc','vote_average.gte':7.4,'vote_count.gte':300,'vote_count.lte':3000},{sort_by:'vote_average.desc','vote_average.gte':7.8,'vote_count.gte':100,'vote_count.lte':1500},p),
  quick:(p,ty)=>disc(ty,{sort_by:'vote_average.desc','vote_average.gte':7.2,'vote_count.gte':1500,'with_runtime.gte':75,'with_runtime.lte':110},{sort_by:'vote_average.desc','vote_average.gte':7.4,'vote_count.gte':200,'with_runtime.lte':30},p),
  soon:async(p,ty)=>{
    const j=[];
    if(ty!=='tv')j.push(tmdb('/movie/upcoming',{region:CFG.region,page:p}).then(r=>lst(r,'movie')));
    if(ty!=='movie')j.push(tmdb('/discover/tv',{sort_by:'first_air_date.asc','first_air_date.gte':iso(1),page:p}).then(r=>lst(r,'tv')));
    const items=(await Promise.all(j)).flat().filter(i=>i.date>=iso(0)).sort((a,b)=>a.date.localeCompare(b.date));
    return{items,more:p<3};
  },
  anime:(p,ty)=>disc(ty,{with_genres:16,with_original_language:'ja',sort_by:'popularity.desc'},{with_genres:16,with_original_language:'ja',sort_by:'popularity.desc'},p)
};

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
  initHero();refreshCont();
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

/* =====================================================================
   DISCOVER — full-screen reel, one title at a time
   ===================================================================== */
const RL={items:[],i:-1,tp:null,busy:false,io:null,muted:true,act:0,last:0,tm:0};
const LITE={};
const lite=it=>LITE[it.key]||(LITE[it.key]=tmdb(`/${it.type}/${it.id}`,{append_to_response:'images,videos',include_image_language:'en,null'}).then(d=>{
  const logo=(d.images&&d.images.logos||[]).filter(l=>l.iso_639_1==='en'||!l.iso_639_1).sort((a,b)=>b.vote_average-a.vote_average)[0];
  return{logo:logo&&logo.file_path,vids:ytIds(d.videos&&d.videos.results),genres:(d.genres||[]).map(g=>g.name),run:d.runtime||(d.episode_run_time&&d.episode_run_time[0])||0,seasons:d.number_of_seasons||0,vote:d.vote_average}
}).catch(()=>({logo:null,vids:[],genres:[]})));
function rcard(it,i){
  const loved=!!U.love[it.key],saved=inWL(it.key);
  return `<article class="rc" data-i="${i}" data-key="${it.key}">
    <div class="rc-art"><img src="${img(it.bd||it.pp,'w1280')}" alt="" ${i<2?'fetchpriority="high"':'loading="lazy"'} draggable="false"><div class="tr"></div></div><div class="rc-shade"></div>
    <div class="rc-info"><div class="rc-logo"><h2>${esc(it.title)}</h2></div><div class="rc-meta"></div></div>
    <div class="rc-act">
      <button class="${loved?'on':''}" data-love="${it.key}" aria-label="Love">${ic('heart',loved?'solid':'')}</button>
      <button class="${saved?'on':''}" data-wl="${it.key}" data-s="${saved?1:0}" aria-label="Save">${ic(saved?'check':'plus')}</button>
      <button data-rskip aria-label="Not for me">${ic('x')}</button>
      <a href="${href(it)}" aria-label="Details">${ic('info')}</a>
      <button data-rmute class="rm" aria-label="Sound" hidden>${ic('mute')}</button>
    </div><div class="burst">${ic('heart','solid')}</div></article>`;
}
async function renderDiscover(){
  const v=$('#v-discover');
  if(v.dataset.ready){reelResume();return}
  v.dataset.ready=1;v.innerHTML=`<div class="reel" id="reel"></div><div class="reel-hint" id="rhint">${ic('chev')}</div>`;
  const reel=$('#reel');
  RL.io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)reelActivate(+e.target.dataset.i)}),{root:reel,threshold:.62});
  await reelMore();
}
async function reelMore(){
  if(RL.busy)return;RL.busy=true;
  try{
    const items=await engineTake(8,'all'),base=RL.items.length;RL.items.push(...items);
    $('#reel').insertAdjacentHTML('beforeend',items.map((it,k)=>rcard(it,base+k)).join(''));
    lazy();$$('#reel .rc').slice(base).forEach(el=>RL.io.observe(el));
  }catch(e){}
  RL.busy=false;
}
async function reelActivate(i){
  if(i===RL.i||TAB!=='discover')return;
  reelStop();RL.i=i;const it=RL.items[i];if(!it)return;
  $$('#reel .rc').forEach(c=>c.classList.toggle('on',+c.dataset.i===i));
  const card=$(`#reel .rc[data-i="${i}"]`);
  $('#rhint')&&$('#rhint').classList.add('gone');
  [1,2,3].forEach(d=>{const n=RL.items[i+d];if(n){lite(n);const im=new Image();im.src=img(n.bd||n.pp,'w1280')}});
  if(i>=RL.items.length-3)reelMore();
  const L=await lite(it);if(RL.i!==i)return;
  const lg=$('.rc-logo',card),mt=$('.rc-meta',card);
  if(L.logo){const im=new Image();im.className='lg';im.alt=it.title;im.src=img(L.logo,'w500');im.onload=()=>{if(RL.i===i){lg.innerHTML='';lg.appendChild(im);requestAnimationFrame(()=>im.classList.add('ld'))}}}
  const bits=[it.year,(L.genres[0]||''),L.run?fmtRun(L.run):(L.seasons?L.seasons+' season'+(L.seasons>1?'s':''):''),L.vote?'★ '+L.vote.toFixed(1):''].filter(Boolean);
  mt.innerHTML=bits.map(esc).join(' <i class="dot"></i> ');
  if(L.vids.length&&isWeb&&CFG.autoplay)setTimeout(()=>{if(RL.i===i)reelPlay(card,L.vids,i)},700);
}
function reelPlay(card,vids,i){
  const tr=$('.tr',card);if(!tr)return;
  ytMount(tr,vids,{mute:true,loop:true,max:3,timeout:9000,
    playing:p=>{if(RL.i!==i)return;if(!RL.muted){try{p.unMute();p.setVolume(100)}catch{}}setTimeout(()=>{tr.classList.add('on');const m=$('.rm',card);if(m){m.hidden=false;m.innerHTML=ic(RL.muted?'mute':'vol')}},700)},
    fail:()=>{tr.innerHTML=''}
  }).then(p=>{if(RL.i===i)RL.tp=p;else if(p&&p.destroy)try{p.destroy()}catch{}});
}
function reelStop(){if(RL.tp&&RL.tp.destroy)try{RL.tp.destroy()}catch{}RL.tp=null;$$('#reel .tr').forEach(t=>{t.classList.remove('on');t.innerHTML=''})}
function reelResume(){const i=RL.i;RL.i=-1;if(i>=0)reelActivate(i)}
function reelNext(){const c=$(`#reel .rc[data-i="${RL.i+1}"]`);if(c)c.scrollIntoView({behavior:'smooth'})}
function reelLove(key,burstCard){
  const on=!U.love[key];
  if(on){U.love[key]=Date.now();learn(key,2)}else{delete U.love[key];learn(key,-2)}
  saveU();vib(on?[8,30,8]:6);
  $$(`[data-love="${key}"]`).forEach(b=>paintLove(b,on,true));
  if(on&&burstCard){burstCard.classList.remove('bursting');void burstCard.offsetWidth;burstCard.classList.add('bursting')}
}
function reelSkip(key){
  U.skip[key]=Date.now();learn(key,-1.3);saveU();vib(12);toast('Less like this','x');reelNext();
}
function reelTap(card){
  const now=Date.now();
  if(now-RL.tm<300){clearTimeout(RL.tt);RL.tm=0;reelLove(card.dataset.key,card);return}
  RL.tm=now;RL.tt=setTimeout(()=>{
    const on=card.classList.toggle('cine');
    if(on&&RL.tp){RL.muted=false;try{RL.tp.unMute();RL.tp.setVolume(100)}catch{}const m=$('.rm',card);if(m)m.innerHTML=ic('vol')}
  },280);
}

/* =====================================================================
   SEARCH + COLLECTIONS
   ===================================================================== */
const COLLS=[
  {id:'noir',n:'Neo-noir after dark',t:'movie',kw:'neo-noir',vc:300},
  {id:'heist',n:'Heist nights',t:'movie',kw:'heist',vc:500},
  {id:'time',n:'Time bends',t:'movie',kw:'time travel',vc:800},
  {id:'slow',n:'Slow burns',t:'movie',p:{with_genres:'53|9648|18','with_runtime.gte':115,'vote_average.gte':7.6,'vote_count.gte':2500}},
  {id:'true',n:'Based on real events',t:'movie',kw:'based on true story',vc:1500},
  {id:'road',n:'Road movies',t:'movie',kw:'road trip',vc:600},
  {id:'dys',n:'Dystopian futures',t:'movie',kw:'dystopia',vc:700},
  {id:'space',n:'Out there',t:'movie',kw:'space',vc:1000},
  {id:'anime',n:'Anime that stays with you',t:'tv',p:{with_genres:16,with_original_language:'ja','vote_count.gte':300}},
  {id:'cozy',n:'Comfort shows',t:'tv',p:{with_genres:'35|10751','vote_average.gte':7.6,'vote_count.gte':400}},
  {id:'feel',n:'Big feelings',t:'movie',p:{with_genres:'18|10749','vote_average.gte':7.8,'vote_count.gte':3000}},
  {id:'mind',n:'Mind-benders',t:'movie',p:{with_genres:'878|9648','vote_average.gte':7.6,'vote_count.gte':4000}}
];
async function collQuery(c,page=1){
  const p={sort_by:'vote_average.desc',page,'vote_count.gte':c.vc||300,...(c.p||{})};
  if(c.kw){const k=await tmdb('/search/keyword',{query:c.kw}).then(r=>r.results&&r.results[0]).catch(()=>null);if(k)p.with_keywords=k.id}
  return tmdb('/discover/'+c.t,p);
}
let killBrowse=()=>{};
function renderExplore(q0,cid){
  killBrowse();
  const root=$('#v-explore'),coll=COLLS.find(c=>c.id===cid);
  if(coll){
    root.innerHTML=`<a class="back" href="#/explore">${ic('back')}</a><h1 class="ctitle">${esc(coll.n)}</h1><div id="exw"></div><div class="sentinel" id="exs"></div>`;
    const wall=new Wall($('#exw'));let page=0;
    killBrowse=infinite($('#exs'),async()=>{page++;const r=await collQuery(coll,page);wall.push(lst(r,coll.t));return page<Math.min(r.total_pages,20)});
    return;
  }
  root.innerHTML=`<label class="sbox">${ic('search')}<input id="exq" type="search" placeholder="Search" autocomplete="off" enterkeyhint="search" value="${esc(q0||'')}"></label><div id="exBody"></div>`;
  const body=$('#exBody'),inp=$('#exq');
  const paint=q=>{
    killBrowse();
    if(!q){
      body.innerHTML=`<div class="covers">${COLLS.map((c,i)=>`<a class="cover" href="#/explore?c=${c.id}" style="--d:${i}"><img alt="" draggable="false" id="cv-${c.id}"><b>${esc(c.n)}</b></a>`).join('')}</div>`;
      COLLS.forEach(async c=>{try{const r=await collQuery(c),x=(r.results||[]).find(z=>z.backdrop_path),el=$('#cv-'+c.id);if(x&&el){el.src=img(x.backdrop_path,'w780');el.onload=()=>el.classList.add('ld')}}catch{}});
      return;
    }
    body.innerHTML=`<div id="exw"></div><div class="sentinel" id="exs"></div>`;
    const wall=new Wall($('#exw'));let page=0;
    killBrowse=infinite($('#exs'),async()=>{page++;const r=await tmdb('/search/multi',{query:q,page,include_adult:false});const l=lst(r);
      if(!l.length&&page===1){$('#exw').innerHTML=`<div class="empty"><b>No results</b><p>Try another spelling.</p></div>`;return false}
      wall.push(l);return page<Math.min(r.total_pages,20)});
  };
  let t;inp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>paint(inp.value.trim()),360)});
  paint((q0||'').trim());
  if(!q0&&innerWidth>900)inp.focus({preventScroll:true});
}

/* =====================================================================
   LIBRARY
   ===================================================================== */
let LIBSEG='watchlist';
async function renderLibrary(){
  const root=$('#v-library'),keys=o=>Object.keys(o).map(k=>META[k]).filter(Boolean);
  const wl=keys(U.wl).sort((a,b)=>U.wl[b.key]-U.wl[a.key]),
        movies=keys(U.seen).sort((a,b)=>U.seen[b.key]-U.seen[a.key]),
        shows=keys(U.eps).filter(m=>epCount(m.key)).sort((a,b)=>Math.max(...Object.values(U.eps[b.key]))-Math.max(...Object.values(U.eps[a.key]))),
        rated=keys(U.rate).sort((a,b)=>U.rate[b.key]-U.rate[a.key]),
        loved=keys(U.love).sort((a,b)=>U.love[b.key]-U.love[a.key]);
  const eps=Object.keys(U.eps).reduce((n,k)=>n+epCount(k),0);
  const seg=[['watchlist','Saved'],['watching','Watching'],['watched','Watched'],['loved','Loved'],['rated','Rated']];
  root.innerHTML=`<h1 class="h1">My List</h1><div class="tabs" id="libTabs">${seg.map(([id,n])=>`<button class="chip ${LIBSEG===id?'on':''}" data-seg="${id}">${n}</button>`).join('')}</div>
    <div class="lstat"><b>${wl.length}</b> saved · <b>${movies.length}</b> films · <b>${eps}</b> episodes${T.on?' · synced':''}</div><div id="libBody"></div>`;
  const body=$('#libBody'),wallOf=list=>{body.innerHTML='<div id="lw"></div>';new Wall($('#lw')).push(list)};
  const empty=(t,p)=>`<div class="empty"><b>${t}</b><p>${p}</p><a class="btn pri" href="#/discover">${ic('reel')}Discover</a></div>`;
  if(LIBSEG==='watchlist')wl.length?wallOf(wl):body.innerHTML=empty('Nothing saved','Tap + on anything you like.');
  else if(LIBSEG==='watched'){const l=[...movies,...shows];l.length?wallOf(l):body.innerHTML=empty('No history yet','Check in a film or episode.')}
  else if(LIBSEG==='loved')loved.length?wallOf(loved):body.innerHTML=empty('No loved titles','Tap the heart in Discover, or double-tap a card.');
  else if(LIBSEG==='rated')rated.length?wallOf(rated):body.innerHTML=empty('No ratings yet','Rate a title from its page.');
  else{
    body.innerHTML=`<div class="wgrid">${Array.from({length:Math.min(shows.length,4)||1},()=>`<div class="wide"><div class="wp sk"></div></div>`).join('')}</div>`;
    const c=await contInfo(24);if(LIBSEG!=='watching')return;
    if(c.length){body.innerHTML=`<div class="wgrid">${c.map((x,i)=>wide(x.it,x.info,i)).join('')}</div>`;lazy();$$('#libBody .meta').forEach(logoInto)}
    else body.innerHTML=empty('Nothing in progress','Start a series and your next episode shows up here.');
  }
  lazy();hydrate([...Object.keys(U.wl),...Object.keys(U.seen),...Object.keys(U.eps),...Object.keys(U.rate),...Object.keys(U.love)]);
}

/* =====================================================================
   DETAIL
   ===================================================================== */
const D={key:null,data:null,tok:0,season:1,vids:[],tp:null,playing:false,muted:true};
const errorHTML=e=>`<div class="empty" style="margin-top:140px"><b>${e&&e.status===401?'TMDB rejected the key':'Couldn’t reach TMDB'}</b><p>${e&&e.status===401?'Check the key in Settings.':'Check your connection.'}</p><button class="btn pri" onclick="openSheet()">Settings</button></div>`;
function skeleton(m){
  return `<div class="d-bg"><img class="bd" src="${img(m&&m.bd,'w1280')}" alt=""><img class="po" src="${img(m&&m.pp,'w780')}" alt=""><div class="tr"></div></div>
  <div class="d-top"><button class="ib" data-back aria-label="Back">${ic('back')}</button><span class="tt">${esc(m?m.title:'')}</span><span class="sp"></span></div>
  <div class="d-scroll"><div class="d-hero"><div class="d-main"><h1 class="d-title">${esc(m?m.title:'')}</h1></div></div><div class="d-body"><div class="dloading"></div></div></div>`;
}
async function openDetail(type,id){
  const key=type+'-'+id,el=$('#detail'),tok=++D.tok,m=META[key];
  killInline();cineReset();ML.kill();D.key=key;D.data=null;D.type=type;D.id=id;D.season=1;D.vids=[];D.playing=false;
  el.className=el.className.replace(/\b(cine|hastr)\b/g,'').trim();
  el.innerHTML=skeleton(m);setTint(el,null);
  el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('lock');
  if(TAB==='discover')reelStop();
  lazy();bindDetail(el);
  if(m&&m.pp)accentFor(m.pp).then(c=>{if(tok===D.tok)setTint(el,c)});
  try{
    const d=await tmdb(`/${type}/${id}`,{append_to_response:type==='movie'?'credits,videos,images,recommendations,release_dates,watch/providers':'aggregate_credits,videos,images,recommendations,content_ratings,watch/providers',include_image_language:'en,null'});
    if(tok!==D.tok)return;
    norm(d,type);D.data=d;paintDetail(el,d,type,tok);
  }catch(e){
    if(tok!==D.tok)return;
    $('.d-body',el).innerHTML=`<div class="empty"><b>Couldn’t load this</b><p>${e.status===404?'It may have been removed.':'Check your connection.'}</p><button class="btn pri" data-back>Back</button></div>`;
  }
}
function killInline(){if(D.tp&&D.tp.destroy)try{D.tp.destroy()}catch{}D.tp=null;D.playing=false}
function closeDetail(){
  const el=$('#detail');if(!el.classList.contains('open'))return;
  ML.kill();
  el.classList.remove('open','cine','hastr','instant');el.setAttribute('aria-hidden','true');document.body.classList.remove('lock');
  D.tok++;D.key=null;D.data=null;killInline();cineReset();
  setTimeout(()=>{if(!el.classList.contains('open'))el.innerHTML=''},450);
  if(TAB==='discover')reelResume();
}
/* cinema mode — everything fades, only the trailer remains */
const CN={t:null,on:false,x:0,y:0};
function cineReset(){clearTimeout(CN.t);CN.on=false}
function cineArm(){
  clearTimeout(CN.t);if(!D.playing||CN.on)return;
  CN.t=setTimeout(()=>{const sc=$('#detail .d-scroll');if(sc&&sc.scrollTop<60&&D.playing&&!$('#modal').classList.contains('open')&&!$('#detail .rate.open'))cineOn()},3600);
}
function cineOn(unmute){
  CN.on=true;$('#detail').classList.add('cine');
  if(unmute&&D.tp)try{D.tp.unMute();D.tp.setVolume(100);D.muted=false;muteIcon()}catch{}
  const b=$('#dCine');if(b)b.innerHTML=ic('shrink');
}
function cineOff(){CN.on=false;$('#detail').classList.remove('cine');const b=$('#dCine');if(b)b.innerHTML=ic('expand');cineArm()}
function muteIcon(){const b=$('#dMute');if(b)b.innerHTML=ic(D.muted?'mute':'vol')}
function wake(e){
  if(!D.playing)return;
  if(e&&e.type==='pointermove'){if(Math.hypot(e.clientX-CN.x,e.clientY-CN.y)<7)return;CN.x=e.clientX;CN.y=e.clientY}
  if(CN.on)cineOff();else cineArm();
}
function bindDetail(el){
  const sc=$('.d-scroll',el),top=$('.d-top',el),bg=$('.d-bg',el);let t=false;
  sc.addEventListener('scroll',()=>{if(t)return;t=true;requestAnimationFrame(()=>{t=false;const y=sc.scrollTop;
    top.classList.toggle('solid',y>Math.min(innerHeight*.45,380));
    bg.style.transform=`translate3d(0,${(-y*.3).toFixed(1)}px,0)`;bg.style.opacity=clamp(1-y/(innerHeight*1.05),.05,1);
    if(D.tp&&D.tp.pauseVideo)try{y>innerHeight*.6?D.tp.pauseVideo():D.tp.playVideo()}catch{}
    cineArm();
  })},{passive:true});
  ['pointermove','pointerdown','keydown','wheel','touchstart'].forEach(ev=>el.addEventListener(ev,wake,{passive:true}));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{root:sc,threshold:.08});
  el._rv=io;
}
function reveal(el){$$('.rv',el).forEach(n=>el._rv&&el._rv.observe(n))}
function certOf(d,type){
  try{
    if(type==='movie'){const rs=d.release_dates.results,r=rs.find(x=>x.iso_3166_1===CFG.region)||rs.find(x=>x.iso_3166_1==='US');return(r&&r.release_dates.find(x=>x.certification)||{}).certification||''}
    const rs=d.content_ratings.results,r=rs.find(x=>x.iso_3166_1===CFG.region)||rs.find(x=>x.iso_3166_1==='US');return r?r.rating:'';
  }catch{return''}
}
const person=(p,role)=>`<div class="person"><div class="ph">${p.profile_path?`<img src="${img(p.profile_path,'w185')}" alt="" loading="lazy">`:esc((p.name||'?')[0])}</div><b>${esc(p.name)}</b><small>${esc(role||'')}</small></div>`;
function actionsHTML(){
  const d=D.data,key=D.key,movie=D.type==='movie',wl=inWL(key),r=U.rate[key],lv=!!U.love[key];let chk;
  if(movie){const s=!!U.seen[key];chk=`<button class="btn sq ${s?'on':''}" data-act="seen" aria-label="${s?'Watched':'Mark watched'}">${ic('check',s?'draw':'')}</button>`}
  else{const n=nextUp(key,d);chk=n?`<button class="btn" data-act="next">${ic('check')}S${n.s} E${n.e}</button>`:`<button class="btn sq" data-act="none" aria-label="Caught up">${ic('check')}</button>`}
  return `${D.vids.length?`<button class="btn pri" data-act="trailer">${ic('play')}Trailer</button>`:''}${chk}
    <button class="btn sq ${wl?'on':''}" data-act="wl" aria-label="Save">${ic(wl?'check':'plus',wl?'draw':'')}</button>
    <button class="btn sq ${lv?'on':''}" data-act="love" aria-label="Love">${ic('heart',lv?'solid':'')}</button>
    <button class="btn sq ${r?'on':''}" data-act="rate" aria-label="Rate">${r?`<b>${r}</b>`:ic('star')}</button>`;
}
function paintActions(){
  const el=$('#detail'),b=$('.btns',el);if(!b||!D.data)return;
  b.innerHTML=actionsHTML();
  $$('#rateRow button',el).forEach(x=>x.classList.toggle('on',+x.dataset.n===U.rate[D.key]));
  if(D.type==='tv'){paintNext();paintEps()}
}
function paintDetail(el,d,type,tok){
  const title=d.title||d.name,year=(d.release_date||d.first_air_date||'').slice(0,4),movie=type==='movie';
  const logo=(d.images&&d.images.logos||[]).filter(l=>l.iso_639_1==='en'||!l.iso_639_1).sort((a,b)=>b.vote_average-a.vote_average)[0];
  D.vids=ytIds(d.videos&&d.videos.results);D.title=title;
  const cert=certOf(d,type),run=movie?d.runtime:(d.episode_run_time&&d.episode_run_time[0])||(d.last_episode_to_air&&d.last_episode_to_air.runtime);
  const genres=(d.genres||[]).map(g=>g.name).slice(0,3);
  const crew=movie?(d.credits&&d.credits.crew||[]):[];
  const dirP=movie?crew.filter(c=>c.job==='Director'):(d.created_by||[]);
  const cast=movie?(d.credits&&d.credits.cast||[]):(d.aggregate_credits&&d.aggregate_credits.cast||[]);
  const prov=d['watch/providers']&&d['watch/providers'].results&&d['watch/providers'].results[CFG.region];
  const seenP=new Set(),pl=prov?['flatrate','free','ads','rent','buy'].flatMap(k=>prov[k]||[]).filter(p=>!seenP.has(p.provider_id)&&seenP.add(p.provider_id)).slice(0,5):[];
  const lang=d.original_language?new Intl.DisplayNames(['en'],{type:'language'}).of(d.original_language):'';
  const fine=[[movie?'Directed by':'Created by',dirP.slice(0,2).map(c=>c.name).join(', ')],[movie?'Released':'First aired',fmtDate(d.release_date||d.first_air_date)],['Language',lang],['Studio',(d.production_companies||d.networks||[]).slice(0,2).map(c=>c.name).join(', ')],['Budget',movie?money(d.budget):''],['Box office',movie?money(d.revenue):'']].filter(f=>f[1]).map(([k,v])=>`${k} <b>${esc(v)}</b>`).join(' · ');
  const clips=(d.videos&&d.videos.results||[]).filter(v=>v.site==='YouTube').sort((a,b)=>D.vids.indexOf(a.key)-D.vids.indexOf(b.key)).slice(0,8);
  const stills=(d.images&&d.images.backdrops||[]).slice(0,10);
  const recs=lst(d.recommendations||{results:[]},type).slice(0,12);
  const people=[...dirP.filter(p=>p.profile_path).slice(0,2).map(p=>person(p,movie?'Director':'Creator')),...cast.slice(0,18).map(p=>person(p,movie?p.character:(p.roles&&p.roles[0]&&p.roles[0].character)))];
  const had=!!$('.d-main',el);
  el.innerHTML=`<div class="d-bg"><img class="bd" src="${img(d.backdrop_path,'w1280')}" alt=""><img class="po" src="${img(d.poster_path,'w780')}" alt=""><div class="tr"></div></div>
  <div class="d-top"><button class="ib" data-back aria-label="Back">${ic('back')}</button><span class="tt">${esc(title)}</span><span class="sp"></span></div>
  <div class="cine-ui"><button class="ib" id="dMute" aria-label="Sound">${ic('mute')}</button><button class="ib" id="dCine" aria-label="Cinema mode">${ic('expand')}</button></div>
  <div class="d-scroll">
   <div class="d-hero"><div class="d-main ${had?'na':''}">
      ${logo?`<h1 class="sr">${esc(title)}</h1><img class="d-logo" src="${img(logo.file_path,'w500')}" alt="${esc(title)}">`:`<h1 class="d-title">${esc(title)}</h1>`}
      <div class="d-line">${[genres.join(' · '),year,fmtRun(run)].filter(Boolean).map((x,i)=>(i?'<i class="dot"></i>':'')+`<span>${esc(x)}</span>`).join('')}${cert?`<span class="badge">${esc(cert)}</span>`:''}${d.vote_average?`<span class="badge">${ic('star','fill')}${d.vote_average.toFixed(1)}</span>`:''}</div>
      ${d.overview?`<p class="d-syn" id="syn">${esc(d.overview)}</p>`:''}
      ${pl.length?`<div class="provs">${pl.map(p=>`<a href="${esc((prov&&prov.link)||'#')}" target="_blank" rel="noopener" title="${esc(p.provider_name)}"><img src="${img(p.logo_path,'w92')}" alt="${esc(p.provider_name)}"></a>`).join('')}</div>`:''}
      <div class="btns">${actionsHTML()}</div>
      <div class="rate" id="rateRow">${Array.from({length:10},(_,i)=>`<button data-n="${i+1}" style="--i:${i}" class="${U.rate[D.key]===i+1?'on':''}">${i+1}</button>`).join('')}</div>
   </div></div>
   <div class="d-body">
    ${movie?'':`<section class="dsec rv"><div id="nextBox"></div></section>
      <section class="dsec bleed rv"><h3>Episodes</h3><div class="seasons" id="seasons">${(d.seasons||[]).filter(s=>s.season_number>0||d.seasons.length===1).map(s=>`<button data-season="${s.season_number}">Season ${s.season_number}</button>`).join('')}</div><div id="epBox"><div class="dloading"></div></div></section>`}
    ${people.length?`<section class="dsec bleed rv"><h3>Cast</h3><div class="drail">${people.join('')}</div></section>`:''}
    ${clips.length||stills.length?`<section class="dsec bleed rv"><h3>Media</h3><div class="drail">${clips.map(v=>`<button class="shot" data-vid="${v.key}" aria-label="Play"><img src="https://i.ytimg.com/vi/${v.key}/hqdefault.jpg" alt="" loading="lazy"><span class="pl"><span>${ic('play')}</span></span></button>`).join('')}${stills.map(s=>`<div class="shot" data-shot="${s.file_path}"><img src="${img(s.file_path,'w500')}" alt="" loading="lazy"></div>`).join('')}</div></section>`:''}
    ${d.belongs_to_collection?`<section class="dsec bleed rv"><h3>${esc(d.belongs_to_collection.name)}</h3><div id="colWall"></div></section>`:''}
    <section class="dsec bleed rv"><div class="mlh"><h3>More like this</h3><div class="tabs" style="padding:0" id="mlTabs"><button class="chip on" data-ml="sim">Similar</button><button class="chip" data-ml="genre">Same vibe</button><button class="chip" data-ml="crew">Cast &amp; crew</button></div></div><div id="mlWall"></div><div class="sentinel" id="mlSent"></div></section>
    ${fine?`<section class="dsec rv"><p class="fine">${fine}</p></section>`:''}
   </div></div>`;
  lazy();bindDetail(el);$('.d-scroll',el).scrollTop=0;reveal(el);
  mlStart('sim');
  accentFor(d.poster_path||d.backdrop_path).then(c=>{if(tok===D.tok)setTint(el,c)});
  if(!movie)initEpisodes(d,tok);
  if(d.belongs_to_collection)tmdb('/collection/'+d.belongs_to_collection.id).then(c=>{const b=$('#colWall',el);if(b&&tok===D.tok)new Wall(b).push(lst({results:c.parts},'movie').sort((a,b)=>a.date.localeCompare(b.date)),{})}).catch(()=>{});
  if(D.vids.length)setTimeout(()=>{if(tok===D.tok)startInline(el,tok)},1000);
}
/* ---------- more like this: three lenses, each infinite ---------- */
const ML={kill:()=>{}};
function mlStart(mode){
  ML.kill();
  const d=D.data,el=$('#detail');if(!d||!el)return;
  $$('#mlTabs .chip',el).forEach(c=>c.classList.toggle('on',c.dataset.ml===mode));
  const wallEl=$('#mlWall',el),sent=$('#mlSent',el);if(!wallEl)return;
  wallEl.innerHTML='';const wall=new Wall(wallEl);
  const type=D.type,seen=new Set([D.key]),fresh=a=>a.filter(i=>!seen.has(i.key)&&seen.add(i.key));
  const movie=type==='movie',crew=movie?(d.credits&&d.credits.crew||[]).filter(c=>c.job==='Director'):(d.created_by||[]);
  const cast=movie?(d.credits&&d.credits.cast||[]):(d.aggregate_credits&&d.aggregate_credits.cast||[]);
  const peopleIds=[...new Set([...crew.map(c=>c.id),...cast.slice(0,3).map(c=>c.id)])].slice(0,5);
  let pool=null;
  const src={
    sim:async p=>{
      const [a,b]=await Promise.all([tmdb(`/${type}/${d.id}/recommendations`,{page:p}).catch(()=>({results:[],total_pages:0})),tmdb(`/${type}/${d.id}/similar`,{page:p}).catch(()=>({results:[],total_pages:0}))]);
      const ok=x=>x&&x.poster_path&&(x.vote_count||0)>=60&&(x.vote_average||0)>=5.6;
      const items=[...a.results.filter(ok).map(x=>norm(x,type)),...b.results.filter(ok).map(x=>norm(x,type))];
      return{items,more:p<Math.min(6,Math.max(a.total_pages,b.total_pages))};
    },
    genre:async p=>{
      const ids=(d.genres||[]).slice(0,2).map(g=>g.id).join(',');
      const r=await tmdb('/discover/'+type,{...(ids?{with_genres:ids}:{}),sort_by:'popularity.desc','vote_count.gte':movie?250:100,'vote_average.gte':6.3,page:p});
      return{items:lst(r,type),more:p<Math.min(8,r.total_pages)};
    },
    crew:async p=>{
      if(!pool){
        const rs=await Promise.all(peopleIds.map(id=>tmdb(`/person/${id}/combined_credits`).catch(()=>({cast:[],crew:[]}))));
        const all=[];
        rs.forEach(r=>[...(r.cast||[]),...(r.crew||[]).filter(c=>['Director','Writer','Screenplay','Creator'].includes(c.job))].forEach(x=>{if(x.poster_path&&(x.vote_count||0)>=150&&(x.media_type==='movie'||x.media_type==='tv'))all.push(x)}));
        all.sort((a,b)=>(b.popularity||0)-(a.popularity||0));pool=all;
      }
      return{items:pool.slice((p-1)*24,p*24).map(x=>norm(x,x.media_type)),more:p*24<pool.length};
    }
  };
  let page=0;
  ML.kill=infinite(sent,async()=>{
    page++;const r=await src[mode](page),items=fresh(r.items);
    if(items.length)wall.push(items);
    else if(page===1&&!r.more)wallEl.innerHTML=`<div class="empty"><b>Nothing found</b><p>Try another tab.</p></div>`;
    return r.more;
  });
}
/* background trailer — if the studio blocks embedding, the still stays and the Trailer button opens the pop-up */
function startInline(el,tok){
  if(!CFG.autoplay||!isWeb||matchMedia('(prefers-reduced-motion:reduce)').matches||(navigator.connection&&navigator.connection.saveData))return;
  const tr=$('.tr',el);if(!tr)return;
  ytMount(tr,D.vids,{mute:true,loop:true,timeout:10000,max:3,
    playing:()=>{if(tok!==D.tok)return;D.playing=true;el.classList.add('hastr');setTimeout(()=>{tr.classList.add('on');cineArm()},800)},
    fail:()=>{tr.innerHTML='';D.playing=false;if(D.tp&&D.tp.destroy)try{D.tp.destroy()}catch{}D.tp=null}
  }).then(p=>{if(tok===D.tok)D.tp=p;else if(p&&p.destroy)try{p.destroy()}catch{}});
}
const seasonCache={};
const getSeason=(id,n)=>seasonCache[id+'-'+n]||(seasonCache[id+'-'+n]=tmdb(`/tv/${id}/season/${n}`));
async function initEpisodes(d,tok){
  const n=nextUp(D.key,d);
  D.season=n?n.s:((d.seasons||[]).find(s=>s.season_number>0)||{season_number:1}).season_number;
  paintNext();await paintEps(tok);
}
async function paintNext(){
  const box=$('#nextBox'),d=D.data;if(!box||!d)return;
  const total=d.number_of_episodes||1,done=epCount(D.key),n=nextUp(D.key,d),pct=Math.round(clamp(done/total,0,1)*100);
  const bar=`<div class="pbar"><i style="width:${pct}%"></i></div>`;
  if(n)try{const s=await getSeason(D.id,n.s),ep=s.episodes.find(x=>x.episode_number===n.e);
    box.innerHTML=`<div class="nextup">${ep&&ep.still_path?`<img src="${img(ep.still_path,'w300')}" alt="">`:''}<div><small>S${n.s} E${n.e}</small><b>${esc(ep?ep.name:'Up next')}</b><button class="btn pri sm" data-act="next">${ic('check')}Check in</button></div></div>${bar}`;return}catch{}
  box.innerHTML=done?bar:'';
}
async function paintEps(tok){
  const box=$('#epBox'),d=D.data;if(!box||!d)return;
  $$('#seasons button').forEach(c=>c.classList.toggle('on',+c.dataset.season===D.season));
  try{
    const s=await getSeason(D.id,D.season);if(tok!=null&&tok!==D.tok)return;if(D.season!==s.season_number)return;
    const w=U.eps[D.key]||{},all=s.episodes.map(e=>[D.season,e.episode_number]),doneN=all.filter(([a,b])=>w[a+'-'+b]).length,today=iso(0);
    box.innerHTML=`<div class="se-act"><button class="btn sm" data-seasonall="${doneN===all.length?0:1}">${ic('check')}${doneN===all.length?'Unmark all':'Mark all'}</button></div>
      <div class="drail">${s.episodes.map(e=>{const on=!!w[D.season+'-'+e.episode_number],ok=!e.air_date||e.air_date<=today;return `<div class="epc ${on?'w':''}"><div class="th">${e.still_path?`<img src="${img(e.still_path,'w500')}" alt="" loading="lazy">`:''}
        <button class="ck ${on?'on':''}" data-ep="${D.season}-${e.episode_number}" aria-label="${on?'Unmark':'Mark'} watched" ${ok?'':'disabled style="opacity:.35"'}>${ic('check',on?'draw':'')}</button></div>
        <b><i>${e.episode_number}</i>${esc(e.name)}</b></div>`}).join('')}</div>`;
    lazy();
  }catch{box.innerHTML=''}
}

/* =====================================================================
   TRAILER POP-UP (bare) — with pop-out + full-screen fallbacks
   ===================================================================== */
const TR={ids:[],i:0,p:null,title:''};
function openTrailer(ids,title){
  TR.ids=ids;TR.i=0;TR.title=title;
  openModal(`<div class="win"><div class="box" id="tbox"><div class="fail" id="tfail"><b>Blocked by the studio</b><p>${isWeb?'It plays fine in its own window.':'Serve the app over http (serve.bat) to play here. It plays fine in its own window.'}</p>
    <div class="row" style="justify-content:center"><button class="btn pri sm" data-pop="0">${ic('play')}Pop-up</button><button class="btn sm" data-pop="1">${ic('expand')}Full-screen</button><a class="btn sm sq" id="tyt" target="_blank" rel="noopener" aria-label="New tab">${ic('ext')}</a></div></div></div></div>
    <div class="mtools"><button class="ib" data-pop="0" aria-label="Pop-up window">${ic('ext')}</button><button class="ib" data-fs aria-label="Full screen">${ic('expand')}</button><button class="ib" data-closemodal aria-label="Close">${ic('x')}</button></div>`,killTrailer);
  mountTrailer();
}
function mountTrailer(){
  const box=$('#tbox');if(!box)return;
  if(TR.p&&TR.p.destroy)try{TR.p.destroy()}catch{}
  const ids=TR.ids.slice(TR.i);
  ytMount(box,ids,{controls:1,max:4,fail:why=>{const f=$('#tfail');if(!f||why==='timeout')return;f.classList.add('show');$('#tyt').href='https://www.youtube.com/watch?v='+ids[0]}}).then(p=>TR.p=p);
  if(!isWeb)setTimeout(()=>{const f=$('#tfail');if(f){f.classList.add('show');$('#tyt').href='https://www.youtube.com/watch?v='+ids[0]}},400);
}
function popTrailer(full){
  const id=TR.ids[TR.i]||TR.ids[0];if(!id)return;
  const sw=screen.availWidth,sh=screen.availHeight,w=full?sw:Math.min(1180,sw-80),h=full?sh:Math.round(w*9/16)+60,l=full?0:Math.round((sw-w)/2),t=full?0:Math.round((sh-h)/2);
  const win=window.open('https://www.youtube.com/watch?v='+id,'lumenTrailer',`popup=yes,width=${w},height=${h},left=${l},top=${t}`);
  if(!win)window.open('https://www.youtube.com/watch?v='+id,'_blank');
}
function toggleFull(){
  const box=$('#tbox');if(!box)return;
  if(document.fullscreenElement)document.exitFullscreen();
  else if(box.requestFullscreen)box.requestFullscreen().catch(()=>{});
  else if(box.webkitRequestFullscreen)box.webkitRequestFullscreen();
}
function killTrailer(){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});if(TR.p&&TR.p.destroy)try{TR.p.destroy()}catch{}TR.p=null}
let modalClose=null;
function openModal(html,onclose){const m=$('#modal');m.innerHTML=html;m.classList.add('open');modalClose=onclose||null}
function closeModal(){const m=$('#modal');if(!m.classList.contains('open'))return;m.classList.remove('open');if(modalClose)modalClose();modalClose=null;setTimeout(()=>{if(!m.classList.contains('open'))m.innerHTML=''},350)}

/* =====================================================================
   ROUTER (+ shared-element morph poster → title)
   ===================================================================== */
let TAB='home',NAV=0,EXSIG='';
const TABS=['home','discover','explore','library','feed'];

function route(force){
  NAV++;
  document.body.classList.toggle('nokey',!CFG.tmdb);
  const raw=location.hash.slice(1)||'/',[path,qs]=raw.split('?'),params=new URLSearchParams(qs||'');
  const dm=path.match(/^\/(m|t)\/(\d+)/);
  if(!CFG.tmdb){closeDetail();TABS.forEach(t=>$('#v-'+t).classList.toggle('on',t==='home'));TAB='home';renderGate();return}
  if(dm){
    const type=dm[1]==='m'?'movie':'tv',id=+dm[2],key=type+'-'+id;
    if(!(D.key===key&&$('#detail').classList.contains('open')&&force!==true))openDetail(type,id);
    if(!$('.view.on'))showTab(TAB,true);
    return;
  }
  closeDetail();
  let tab=path.split('/')[1]||'home';
  if(tab==='movies'||tab==='series'){FD.ty=tab==='movies'?'movie':'tv';location.replace('#/feed/trend');return}
  showTab(TABS.includes(tab)?tab:'home',force===true,params,path.split('/')[2]);
}
function showTab(tab,force,params,arg){
  const sig=tab==='explore'&&params?(params.get('q')||'')+'|'+(params.get('c')||''):tab==='feed'?(arg||'you')+'|'+FD.ty:'';
  const changed=tab!==TAB||!$('#v-'+tab).classList.contains('on')||force||(tab==='explore'&&sig!==EXSIG)||(tab==='feed'&&sig!==EXSIG);
  const leaving=TAB;TAB=tab;$('#dock').classList.remove('mini');lastY=0;
  if(leaving==='discover'&&tab!=='discover')reelStop();
  document.body.classList.toggle('reelmode',tab==='discover');
  $$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+tab));
  $$('[data-tab]').forEach(a=>{const on=a.dataset.tab===(tab==='feed'?'home':tab);a.classList.toggle('on',on);const s=a.querySelector('[data-ic]');if(s&&a.closest('#dock'))s.innerHTML=ic(s.dataset.ic,on?'solid':'')});
  if(!changed){if(tab==='discover')reelResume();return}
  const v=$('#v-'+tab);
  if(tab==='home'){if(force||!v.firstChild||v.querySelector('.gate'))renderHome()}
  else if(tab==='feed'){EXSIG=sig;renderFeed(arg||'you')}
  else if(tab==='discover')renderDiscover();
  else if(tab==='explore'){EXSIG=sig;renderExplore(params&&params.get('q'),params&&params.get('c'))}
  else if(tab==='library')renderLibrary();
  window.scrollTo(0,0);
}
function go(h,imgEl){
  if(go.busy||!document.startViewTransition||matchMedia('(prefers-reduced-motion:reduce)').matches){location.hash=h;return}
  go.busy=true;
  const det=$('#detail');det.classList.add('instant');
  $$('[style*="view-transition-name"]').forEach(n=>n.style.viewTransitionName='');
  if(imgEl)imgEl.style.viewTransitionName='hero';
  if(location.hash!=='#'+h)history.pushState(null,'','#'+h);
  let vt;
  try{vt=document.startViewTransition(()=>{if(imgEl)imgEl.style.viewTransitionName='';route(true);const bg=$('#detail .d-bg');if(bg)bg.style.viewTransitionName='hero'})}
  catch{go.busy=false;det.classList.remove('instant');route(true);return}
  vt.ready.catch(()=>{});
  vt.finished.catch(()=>{}).finally(()=>{go.busy=false;$$('[style*="view-transition-name"]').forEach(n=>n.style.viewTransitionName='');setTimeout(()=>det.classList.remove('instant'),50)});
}
addEventListener('hashchange',()=>route());

/* =====================================================================
   EVENTS / BOOT
   ===================================================================== */
let lpFired=false,LP=null;
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest&&e.target.closest('.tile');if(!t||e.target.closest('.qa'))return;
  LP={x:e.clientX,y:e.clientY,t:setTimeout(()=>{lpFired=true;hideTile(t)},620)};
},{passive:true});
document.addEventListener('pointermove',e=>{if(LP&&Math.hypot(e.clientX-LP.x,e.clientY-LP.y)>10){clearTimeout(LP.t);LP=null}},{passive:true});
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>{if(LP){clearTimeout(LP.t);LP=null}},{passive:true}));
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.tile,.rc'))e.preventDefault()});
function hideTile(t){
  const k=t.dataset.key;U.skip[k]=Date.now();learn(k,-1.2);saveU();vib(14);toast('Less like this','x');
  t.classList.add('gone');setTimeout(()=>t.remove(),420);
}
document.addEventListener('click',e=>{
  const t=e.target;let el;
  if(lpFired){lpFired=false;e.preventDefault();e.stopPropagation();return}
  if((el=t.closest('[data-wl]'))){e.preventDefault();e.stopPropagation();return toggleWL(el.dataset.wl)}
  if((el=t.closest('[data-love]'))){e.preventDefault();e.stopPropagation();return reelLove(el.dataset.love)}
  if(t.closest('[data-rskip]')){const c=t.closest('.rc');return reelSkip(c.dataset.key)}
  if(t.closest('[data-rmute]')){const c=t.closest('.rc');RL.muted=!RL.muted;if(RL.tp)try{RL.muted?RL.tp.mute():(RL.tp.unMute(),RL.tp.setVolume(100))}catch{}$('.rm',c).innerHTML=ic(RL.muted?'mute':'vol');return}
  if((el=t.closest('[data-ci]'))){e.preventDefault();e.stopPropagation();return checkInNext(el.dataset.ci)}
  if((el=t.closest('.seg [data-ty]'))){FD.ty=el.dataset.ty;return renderFeed(FD.id)}
  if((el=t.closest('[data-rs]'))){const r=el.parentElement.querySelector('.rail');return r.scrollBy({left:+el.dataset.rs*r.clientWidth*.85,behavior:'smooth'})}
  if((el=t.closest('[data-q]')))return quizToggle(el);
  if(t.closest('#qdone'))return quizDone();
  if((el=t.closest('[data-seg]'))){LIBSEG=el.dataset.seg;return renderLibrary()}
  if(t.closest('[data-back]')){e.preventDefault();return NAV>1&&history.length>1?history.back():(location.hash='#/')}
  if(t.closest('[data-fs]'))return toggleFull();
  if((el=t.closest('[data-pop]')))return popTrailer(el.dataset.pop==='1');
  if((el=t.closest('[data-closemodal]'))||t.id==='modal')return closeModal();
  if(t.id==='scrim')return closeSheet();
  if(t.closest('#avatarBtn'))return openSheet();
  if((el=t.closest('[data-hero-tr]'))){const it=HERO.items[+el.dataset.heroTr];return openTrailer(it.tr,it.title)}
  if(t.closest('#dMute')){D.muted=!D.muted;if(D.tp)try{D.muted?D.tp.mute():(D.tp.unMute(),D.tp.setVolume(100))}catch{}return muteIcon()}
  if(t.closest('#dCine'))return CN.on?cineOff():cineOn(true);
  if((el=t.closest('#detail [data-act]'))){const a=el.dataset.act,k=D.key;
    if(a==='seen')toggleSeen(k);else if(a==='next')checkInNext(k);else if(a==='wl')toggleWL(k);
    else if(a==='love'){const on=!U.love[k];on?(U.love[k]=Date.now(),learn(k,2)):(delete U.love[k],learn(k,-2));saveU();vib(on?[8,30,8]:6);paintActions()}
    else if(a==='trailer'){D.playing?cineOn(true):openTrailer(D.vids,D.title)}
    else if(a==='rate')$('#rateRow').classList.toggle('open');
    else if(a==='none')toast(epCount(k)?'All caught up':'Not aired yet','clock');
    return;
  }
  if((el=t.closest('#rateRow [data-n]'))){setRate(D.key,+el.dataset.n);$('#rateRow').classList.remove('open');return}
  if((el=t.closest('[data-vid]'))){const id=el.dataset.vid;return openTrailer([id,...D.vids.filter(x=>x!==id)],D.title)}
  if((el=t.closest('[data-shot]')))return openModal(`<div class="win"><div class="box"><img src="${img(el.dataset.shot,'w1280')}" alt=""></div></div><div class="mtools"><button class="ib" data-closemodal aria-label="Close">${ic('x')}</button></div>`);
  if((el=t.closest('[data-ml]')))return mlStart(el.dataset.ml);
  if((el=t.closest('[data-season]'))){D.season=+el.dataset.season;return paintEps(D.tok)}
  if((el=t.closest('[data-seasonall]'))){getSeason(D.id,D.season).then(s=>setEps(D.key,s.episodes.filter(x=>!x.air_date||x.air_date<=iso(0)).map(x=>[D.season,x.episode_number]),el.dataset.seasonall==='1'));return}
  if((el=t.closest('[data-ep]'))&&!el.disabled){const [s,n]=el.dataset.ep.split('-').map(Number);return setEps(D.key,[[s,n]],!el.classList.contains('on'))}
  if(t.closest('#syn')){$('#syn').classList.toggle('open');return}
  if((el=t.closest('.rc-art'))&&!t.closest('button,a'))return reelTap(el.closest('.rc'));
  if((el=t.closest('a.tile,a.wide,a.hero-a'))&&!e.metaKey&&!e.ctrlKey){e.preventDefault();return go(el.getAttribute('href').slice(1),el.querySelector('img'))}
});
document.addEventListener('dblclick',e=>{if(e.target.closest('#tbox'))toggleFull()});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  if(e.key==='Escape'){
    if($('#modal').classList.contains('open'))closeModal();
    else if($('#sheetWrap').classList.contains('open'))closeSheet();
    else if(CN.on)cineOff();
    else if($('#detail').classList.contains('open'))$('#detail [data-back]')?.click();
  }else if((e.key==='f'||e.key==='F')&&$('#modal').classList.contains('open')&&$('#tbox'))toggleFull();
  else if(TAB==='discover'&&!$('#detail').classList.contains('open')){
    if(e.key==='ArrowDown'||e.key==='j')reelNext();else if(e.key==='ArrowUp'||e.key==='k'){const c=$(`#reel .rc[data-i="${RL.i-1}"]`);c&&c.scrollIntoView({behavior:'smooth'})}
    else if(e.key==='l'&&RL.items[RL.i])reelLove(RL.items[RL.i].key,$(`#reel .rc.on`));
  }
});
let lastY=0,dockT=0;
addEventListener('scroll',()=>{
  const y=scrollY;$('#nav').classList.toggle('solid',y>30);
  if(dockT)return;dockT=requestAnimationFrame(()=>{
    dockT=0;const d=y-lastY,dk=$('#dock');
    if(y<24||d<-8)dk.classList.remove('mini');else if(d>8&&y>90)dk.classList.add('mini');
    if(Math.abs(d)>8)lastY=y;
  });
},{passive:true});

function boot(){
  $$('#links [data-ic],#dock [data-ic]').forEach(s=>s.innerHTML=ic(s.dataset.ic));
  paintAvatar();
  route(true);
  if(T.on&&CFG.tmdb)syncNow(true);
}
boot();
