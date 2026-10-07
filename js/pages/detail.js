'use strict';
/* =====================================================================
   DETAIL
   ===================================================================== */
const D={key:null,data:null,tok:0,season:1,vids:[],tp:null,playing:false,muted:true};
const errorHTML=e=>`<div class="empty" style="margin-top:140px"><b>${e&&e.status===401?'TMDB rejected the key':'Couldn’t reach TMDB'}</b><p>${e&&e.status===401?'Check the key in Settings.':'Check your connection.'}</p><button class="btn pri" onclick="openSheet()">Settings</button></div>`;
function skeleton(m){
  return `<div class="d-bg"><img class="bd" src="${img(m&&m.bd,'w1280')}" alt=""><img class="po" src="${img(m&&m.pp,'w780')}" alt=""><div class="tr"></div></div>
  <div class="d-top"><div class="pblur" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><button class="ib" data-back aria-label="Back">${ic('back')}</button><span class="tt">${esc(m?m.title:'')}</span><span class="sp"></span></div>
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
    const d=await tmdb(`/${type}/${id}`,{append_to_response:type==='movie'?'credits,videos,images,recommendations,release_dates,watch/providers,keywords':'aggregate_credits,videos,images,recommendations,content_ratings,watch/providers,keywords',include_image_language:'en,null'});
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
  <div class="d-top"><div class="pblur" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><button class="ib" data-back aria-label="Back">${ic('back')}</button><span class="tt">${esc(title)}</span><span class="sp"></span></div>
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
    <section class="dsec bleed rv"><h3>More like this</h3><div class="mlbar" id="mlTabs">${mlModes(d,type).map(([id,n],i)=>`<button class="chip ${i?'':'on'}" data-ml="${id}">${n}</button>`).join('')}</div><div id="mlWall"></div><div class="sentinel" id="mlSent"></div></section>
    ${fine?`<section class="dsec rv"><p class="fine">${fine}</p></section>`:''}
   </div></div>`;
  lazy();bindDetail(el);$('.d-scroll',el).scrollTop=0;reveal(el);
  mlStart('sim');
  accentFor(d.poster_path||d.backdrop_path).then(c=>{if(tok===D.tok)setTint(el,c)});
  if(!movie)initEpisodes(d,tok);
  if(d.belongs_to_collection)tmdb('/collection/'+d.belongs_to_collection.id).then(c=>{const b=$('#colWall',el);if(b&&tok===D.tok)new Wall(b).push(lst({results:c.parts},'movie').sort((a,b)=>a.date.localeCompare(b.date)),{})}).catch(()=>{});
  if(D.vids.length)setTimeout(()=>{if(tok===D.tok)startInline(el,tok)},1000);
}
/* ---------- more like this: many lenses, each infinite; the selector bar sticks ---------- */
const ML={kill:()=>{}};
function mlModes(d,type){
  const movie=type==='movie',kws=((d.keywords&&(d.keywords.keywords||d.keywords.results))||[]),co=movie?(d.production_companies||[]):(d.networks||[]);
  const m=[['sim','Similar'],['genre','Same vibe']];
  if(kws.length)m.push(['themes','Themes']);
  m.push(['crew','Cast & crew']);
  if(co.length)m.push(['studio',movie?'Same studio':'Same network']);
  m.push(['era','Same era'],['fresh','Newer'],['top','Top rated'],['gems','Hidden gems']);
  if(d.original_language&&d.original_language!=='en')m.push(['lang','Same language']);
  return m;
}
function mlStart(mode){
  ML.kill();
  const d=D.data,el=$('#detail');if(!d||!el)return;
  const bar=$('#mlTabs',el);$$('#mlTabs .chip',el).forEach(c=>{const on=c.dataset.ml===mode;c.classList.toggle('on',on);if(on&&bar)bar.scrollTo({left:c.offsetLeft-bar.clientWidth/2+c.offsetWidth/2,behavior:'smooth'})});
  const wallEl=$('#mlWall',el),sent=$('#mlSent',el);if(!wallEl)return;
  wallEl.innerHTML='';const wall=new Wall(wallEl);
  const type=D.type,seen=new Set([D.key]),fresh=a=>a.filter(i=>!seen.has(i.key)&&seen.add(i.key));
  const movie=type==='movie',year=+((d.release_date||d.first_air_date||'2000').slice(0,4)),dk=movie?'primary_release_date':'first_air_date';
  const g1=(d.genres||[]).slice(0,1).map(g=>g.id).join(','),g2=(d.genres||[]).slice(0,2).map(g=>g.id).join(',');
  const kws=((d.keywords&&(d.keywords.keywords||d.keywords.results))||[]).slice(0,4).map(k=>k.id).join('|');
  const co=movie?(d.production_companies||[])[0]:(d.networks||[])[0];
  const crew=movie?(d.credits&&d.credits.crew||[]).filter(c=>c.job==='Director'):(d.created_by||[]);
  const cast=movie?(d.credits&&d.credits.cast||[]):(d.aggregate_credits&&d.aggregate_credits.cast||[]);
  const peopleIds=[...new Set([...crew.map(c=>c.id),...cast.slice(0,3).map(c=>c.id)])].slice(0,5);
  let pool=null;
  const dsc=async(p,params)=>{const r=await tmdb('/discover/'+type,{...params,page:p});return{items:lst(r,type),more:p<Math.min(8,r.total_pages)}};
  const vc=movie?{a:250,b:1500}:{a:100,b:600};
  const src={
    sim:async p=>{
      const [a,b]=await Promise.all([tmdb(`/${type}/${d.id}/recommendations`,{page:p}).catch(()=>({results:[],total_pages:0})),tmdb(`/${type}/${d.id}/similar`,{page:p}).catch(()=>({results:[],total_pages:0}))]);
      const ok=x=>x&&x.poster_path&&(x.vote_count||0)>=60&&(x.vote_average||0)>=5.6;
      return{items:[...a.results.filter(ok).map(x=>norm(x,type)),...b.results.filter(ok).map(x=>norm(x,type))],more:p<Math.min(6,Math.max(a.total_pages,b.total_pages))};
    },
    genre:p=>dsc(p,{...(g2?{with_genres:g2}:{}),sort_by:'popularity.desc','vote_count.gte':vc.a,'vote_average.gte':6.3}),
    themes:p=>dsc(p,{with_keywords:kws,sort_by:'popularity.desc','vote_count.gte':100,'vote_average.gte':6}),
    studio:p=>dsc(p,{[movie?'with_companies':'with_networks']:co&&co.id,sort_by:'popularity.desc','vote_count.gte':60}),
    era:p=>dsc(p,{...(g1?{with_genres:g1}:{}),sort_by:'vote_average.desc','vote_count.gte':vc.a+100,[dk+'.gte']:(year-5)+'-01-01',[dk+'.lte']:(year+5)+'-12-31'}),
    fresh:p=>dsc(p,{...(g2?{with_genres:g2}:{}),sort_by:'popularity.desc','vote_count.gte':50,[dk+'.gte']:(new Date().getFullYear()-3)+'-01-01'}),
    top:p=>dsc(p,{...(g2?{with_genres:g2}:{}),sort_by:'vote_average.desc','vote_count.gte':vc.b}),
    gems:p=>dsc(p,{...(g2?{with_genres:g2}:{}),sort_by:'vote_average.desc','vote_average.gte':7,'vote_count.gte':100,'vote_count.lte':vc.b}),
    lang:p=>dsc(p,{with_original_language:d.original_language,sort_by:'vote_average.desc','vote_count.gte':150}),
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
    else if(page===1&&!r.more)wallEl.innerHTML=`<div class="empty"><b>Nothing found</b><p>Try another selector.</p></div>`;
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

