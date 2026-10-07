'use strict';
/* =====================================================================
   RECOMMENDATION ENGINE + FEEDS
   Every save / love / rate / skip nudges genre weights (core/data.js
   learn()). The engine blends seed-based recs from your list, genre
   discovery, one random exploration genre and trending.
   ===================================================================== */
const ENG={pool:new Map(),served:new Set(),page:0,why:'',dirty:false};
const ownedKeys=()=>new Set([...Object.keys(U.seen),...Object.keys(U.love),...Object.keys(U.rate),...Object.keys(U.wl),...Object.keys(U.skip),...Object.keys(U.eps).filter(k=>epCount(k))]);
function addPool(it,base){
  if(!it||!it.pp)return;const o=ENG.pool.get(it.key);
  if(o)o.base=Math.max(o.base,base)+.18;else ENG.pool.set(it.key,{it,base});
}
/* the titles that currently define your taste: loved, rated 8+, recently watched, recently saved */
function tasteSeeds(n=9){
  const by=o=>Object.keys(o).sort((a,b)=>o[b]-o[a]);
  const lastEp=k=>Math.max(0,...Object.values(U.eps[k]||{}));
  return [...new Set([...by(U.love).slice(0,4),...Object.keys(U.rate).filter(k=>U.rate[k]>=8),...by(U.wl).slice(0,5),...by(U.seen).slice(0,4),...Object.keys(U.eps).filter(k=>epCount(k)).sort((a,b)=>lastEp(b)-lastEp(a)).slice(0,3)])].filter(k=>META[k]).slice(0,n);
}
async function seedRecs(){
  const seeds=tasteSeeds();
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
  if(ENG.dirty&&ENG.page>0){ENG.dirty=false;await seedRecs()}   // your list changed → re-seed from it
  const own=ownedKeys();
  const avail=()=>[...ENG.pool.values()].filter(o=>!ENG.served.has(o.it.key)&&!own.has(o.it.key)&&(ty==='all'||o.it.type===ty)&&affinity(o.it)>-1.6);
  let a=avail(),g=0;
  while(a.length<count&&g++<4){await engineFill();a=avail()}
  const sc=o=>o.base+affinity(o.it)*.3+(o.it.vote||0)/22+Math.random()*.45;
  const out=a.map(o=>({o,s:sc(o)})).sort((x,y)=>y.s-x.s).slice(0,count).map(x=>x.o.it);
  out.forEach(it=>ENG.served.add(it.key));
  return out;
}
const resetEngine=()=>{ENG.pool.clear();ENG.served.clear();ENG.page=0;ENG.why='';ENG.dirty=false};
function whyLine(){
  const tg=topGenres(2).map(g=>GN[g]).filter(Boolean);
  if(Array.isArray(ENG.why)&&ENG.why.length)return `Because you liked <b>${ENG.why.map(esc).join('</b>, <b>')}</b>`;
  if(tg.length)return `Tuned to <b>${tg.join('</b> · <b>')}</b>`;
  return `Love a few titles and this feed learns your taste`;
}

/* ---------- discover helpers ---------- */
const tvGenre=g=>({28:10759,12:10759,878:10765,14:10765,10752:10768}[g]||g);
async function disc(ty,pm,pt,page){
  const types=[ty!=='tv'&&'movie',ty!=='movie'&&'tv'].filter(Boolean);
  const rs=await Promise.all(types.map(t=>tmdb('/discover/'+t,{...(t==='movie'?pm:pt),page})));
  const ls=rs.map((r,i)=>lst(r,types[i])),out=[];
  for(let i=0;i<Math.max(...ls.map(l=>l.length));i++)ls.forEach(l=>l[i]&&out.push(l[i]));
  return{items:out,more:page<Math.min(8,...rs.map(r=>r.total_pages))};
}
const kwMemo={};
const kwId=n=>kwMemo[n]||(kwMemo[n]=tmdb('/search/keyword',{query:n}).then(r=>r.results&&r.results[0]&&r.results[0].id).catch(()=>null));
async function discKw(ty,name,pm,pt,page){const id=await kwId(name),kw=id?{with_keywords:id}:{};return disc(ty,{...pm,...kw},{...pt,...kw},page)}
const dec=(a,b,vc)=>(p,ty)=>disc(ty,{sort_by:'vote_average.desc','vote_count.gte':vc,'primary_release_date.gte':a+'-01-01','primary_release_date.lte':b+'-12-31'},{sort_by:'vote_average.desc','vote_count.gte':Math.round(vc/6),'first_air_date.gte':a+'-01-01','first_air_date.lte':b+'-12-31'},p);
const LANGS=()=>CFG.region==='IN'?[['hi','Hindi Cinema'],['ta','Tamil Cinema'],['te','Telugu Cinema'],['ml','Malayalam Cinema']]:[['ko','Korean Cinema'],['ja','Japanese Cinema'],['fr','French Cinema'],['es','Spanish-language Cinema']];
const langFeed=(i)=>(p,ty)=>{const [c]=LANGS()[i],x=c==='ja'?{without_genres:16}:{};return disc(ty,{with_original_language:c,sort_by:'vote_average.desc','vote_count.gte':300,...x},{with_original_language:c,sort_by:'vote_average.desc','vote_count.gte':60,...x},p)};
const listPage=async(path,p,ty,type)=>{const r=await tmdb(path,{page:p,region:CFG.region});return{items:lst(r,type),more:p<Math.min(8,r.total_pages)}};

/* id, title, eyebrow, sub */
const FEEDS=[
  ['you','Top Picks For You','Made for you',''],
  ['trend','Trending Now','Everyone’s watching',''],
  ['new','New This Week','Just landed',''],
  ['top250','Top 250','The all-time list','Highest rated, ranked.'],
  ['streaming','Streaming Now','Popular on your services','Right now in your region.'],
  ['gems','Hidden Gems','Loved, rarely talked about','High ratings, small crowds.'],
  ['quick','Quick Watches','Under 2 hours','Great films that respect your evening.'],
  ['dec90','Best of the 90s','Decade list',''],
  ['lang1','World Cinema','World cinema',''],
  ['nowplaying','In Theaters','Now showing',''],
  ['soon','Coming Soon','In theaters & streaming',''],
  ['docs','Documentaries','True stories',''],
  ['cult','Cult Classics','Midnight movies',''],
  ['anime','Anime Spotlight','Subbed & dubbed',''],
  ['binge','Binge-Worthy Series','Top-rated shows',''],
  ['dec00','Best of the 2000s','Decade list',''],
  ['lang2','World Cinema','World cinema',''],
  ['feelgood','Feel-Good','Comfort picks',''],
  ['airing','Airing Today','New episodes',''],
  ['dec10','Best of the 2010s','Decade list','']
];
const FP={
  you:async(p,ty)=>({items:await engineTake(18,ty),more:true}),
  trend:async(p,ty)=>{const r=await tmdb(`/trending/${ty}/week`,{page:p});return{items:lst(r,ty==='all'?undefined:ty),more:p<Math.min(r.total_pages,10)}},
  new:(p,ty)=>disc(ty,{sort_by:'popularity.desc','primary_release_date.gte':iso(-30),'primary_release_date.lte':iso(0),region:CFG.region,with_release_type:'2|3'},{sort_by:'popularity.desc','first_air_date.gte':iso(-30),'first_air_date.lte':iso(0)},p),
  top250:async(p,ty)=>{const r=await tmdb(ty==='tv'?'/tv/top_rated':'/movie/top_rated',{page:p});return{items:lst(r,ty==='tv'?'tv':'movie'),more:p<13,rank:(p-1)*20}},
  streaming:(p,ty)=>disc(ty,{watch_region:CFG.region,with_watch_monetization_types:'flatrate',sort_by:'popularity.desc'},{watch_region:CFG.region,with_watch_monetization_types:'flatrate',sort_by:'popularity.desc'},p),
  gems:(p,ty)=>disc(ty,{sort_by:'vote_average.desc','vote_average.gte':7.4,'vote_count.gte':300,'vote_count.lte':3000},{sort_by:'vote_average.desc','vote_average.gte':7.8,'vote_count.gte':100,'vote_count.lte':1500},p),
  quick:(p,ty)=>disc(ty,{sort_by:'vote_average.desc','vote_average.gte':7.2,'vote_count.gte':1500,'with_runtime.gte':75,'with_runtime.lte':110},{sort_by:'vote_average.desc','vote_average.gte':7.4,'vote_count.gte':200,'with_runtime.lte':30},p),
  dec90:dec(1990,1999,1200),dec00:dec(2000,2009,1500),dec10:dec(2010,2019,2000),
  lang1:langFeed(0),lang2:langFeed(1),
  nowplaying:(p,ty)=>listPage(ty==='tv'?'/tv/on_the_air':'/movie/now_playing',p,ty,ty==='tv'?'tv':'movie'),
  airing:(p,ty)=>listPage(ty==='movie'?'/movie/now_playing':'/tv/airing_today',p,ty,ty==='movie'?'movie':'tv'),
  soon:async(p,ty)=>{
    const j=[];
    if(ty!=='tv')j.push(tmdb('/movie/upcoming',{region:CFG.region,page:p}).then(r=>lst(r,'movie')));
    if(ty!=='movie')j.push(tmdb('/discover/tv',{sort_by:'first_air_date.asc','first_air_date.gte':iso(1),page:p}).then(r=>lst(r,'tv')));
    const items=(await Promise.all(j)).flat().filter(i=>i.date>=iso(0)).sort((a,b)=>a.date.localeCompare(b.date));
    return{items,more:p<3};
  },
  docs:(p,ty)=>disc(ty,{with_genres:99,sort_by:'popularity.desc','vote_average.gte':6.8,'vote_count.gte':150},{with_genres:99,sort_by:'popularity.desc','vote_average.gte':7,'vote_count.gte':60},p),
  cult:(p,ty)=>discKw(ty,'cult film',{sort_by:'vote_average.desc','vote_count.gte':300},{sort_by:'vote_average.desc','vote_count.gte':80},p),
  feelgood:(p,ty)=>discKw(ty,'feel good',{sort_by:'vote_average.desc','vote_count.gte':300},{sort_by:'vote_average.desc','vote_count.gte':80},p),
  anime:(p,ty)=>disc(ty,{with_genres:16,with_original_language:'ja',sort_by:'popularity.desc'},{with_genres:16,with_original_language:'ja',sort_by:'popularity.desc'},p),
  top10:async()=>({items:lst(await tmdb('/trending/all/day')).slice(0,10),more:false}),
  binge:async(p,ty)=>{const r=await tmdb(ty==='movie'?'/movie/top_rated':'/tv/top_rated',{page:p});return{items:lst(r,ty==='movie'?'movie':'tv'),more:p<Math.min(8,r.total_pages)}}
};
/* personalised + Trakt-list feeds are resolved by id */
async function traktListPage(id,p){
  const [meta,items]=await Promise.all([p===1?T.pub('/lists/'+id).catch(()=>null):null,T.pub(`/lists/${id}/items/movie,show?page=${p}&limit=30`)]);
  const stubs=items.map(x=>x.movie?['movie',x.movie.ids.tmdb]:x.show?['tv',x.show.ids.tmdb]:null).filter(x=>x&&x[1]);
  const out=(await Promise.all(stubs.map(([t,i])=>tmdb(`/${t}/${i}`).then(d=>norm(d,t)).catch(()=>null)))).filter(i=>i&&i.pp);
  return{items:out,more:items.length>=30,rank:(p-1)*30,title:meta&&meta.name,desc:meta&&meta.description};
}
/* mood feeds: the same mood, five different ways in */
function moodFeed(M,kind){
  const gm=M.g?{with_genres:M.g}:{},gt=M.tg?{with_genres:M.tg}:{};
  const short=M.id==='short'?{'with_runtime.lte':100,'with_runtime.gte':70}:{};
  return (p,ty)=>{
    if(kind==='movies')return disc('movie',{...gm,...short,sort_by:'popularity.desc','vote_average.gte':6.8,'vote_count.gte':400},{},p);
    if(kind==='series')return disc('tv',{},{...(M.tg?gt:{}),...(M.id==='short'?{'with_runtime.lte':30}:{}),sort_by:'popularity.desc','vote_average.gte':7,'vote_count.gte':150},p);
    if(kind==='gems')return disc(ty,{...gm,...short,sort_by:'vote_average.desc','vote_average.gte':7.3,'vote_count.gte':200,'vote_count.lte':2500},{...gt,sort_by:'vote_average.desc','vote_average.gte':7.8,'vote_count.gte':80,'vote_count.lte':1200},p);
    if(kind==='classics')return disc('movie',{...gm,...short,sort_by:'vote_average.desc','vote_average.gte':7.5,'vote_count.gte':1500,'primary_release_date.lte':'2005-12-31'},{},p);
    return disc(ty,{...gm,...short,sort_by:'popularity.desc','vote_count.gte':100,'primary_release_date.gte':(new Date().getFullYear()-2)+'-01-01'},{...gt,sort_by:'popularity.desc','vote_count.gte':50,'first_air_date.gte':(new Date().getFullYear()-2)+'-01-01'},p);
  };
}
const personMemo={};
async function personPage(id,p){
  if(!personMemo[id])personMemo[id]=Promise.all([tmdb('/person/'+id),tmdb(`/person/${id}/combined_credits`)]).then(([pe,cr])=>{
    const all=[...(cr.cast||[]),...(cr.crew||[]).filter(c=>['Director','Writer','Screenplay','Creator'].includes(c.job))].filter(x=>x.poster_path&&(x.media_type==='movie'||x.media_type==='tv')&&(x.vote_count||0)>=40);
    const seen=new Set(),items=all.sort((a,b)=>(b.popularity||0)-(a.popularity||0)).filter(x=>!seen.has(x.media_type+x.id)&&seen.add(x.media_type+x.id));
    return{name:pe.name,items};
  });
  const d=await personMemo[id];
  return{items:d.items.slice((p-1)*24,p*24).map(x=>norm(x,x.media_type)),more:p*24<d.items.length,title:d.name};
}
function feedFn(id){
  if(FP[id])return FP[id];
  if(id.startsWith('bc:')){const k=id.slice(3),m=META[k];
    return async p=>{const r=await tmdb(`/${m.type}/${m.id}/recommendations`,{page:p}),own=ownedKeys();return{items:lst(r,m.type).filter(i=>!own.has(i.key)&&i.key!==k),more:p<Math.min(5,r.total_pages)}}}
  if(id.startsWith('g:')){const g=+id.slice(2);
    return (p,ty)=>disc(ty,{with_genres:g,sort_by:'popularity.desc','vote_average.gte':7,'vote_count.gte':400},{with_genres:tvGenre(g),sort_by:'popularity.desc','vote_average.gte':7.2,'vote_count.gte':150},p)}
  if(id.startsWith('trakt:'))return p=>traktListPage(id.slice(6),p);
  if(id.startsWith('m:')){const [,mood,kind]=id.split(':');return moodFeed(MOODS.find(x=>x.id===mood)||MOODS[0],kind)}
  if(id.startsWith('p:'))return p=>personPage(id.slice(2),p);
  return FP.trend;
}
function feedMeta(id){
  const f=FEEDS.find(x=>x[0]===id);
  if(f){let t=f[1];if(id==='lang1')t=LANGS()[0][1];if(id==='lang2')t=LANGS()[1][1];return{t,e:f[2],s:f[3]}}
  if(id.startsWith('bc:')){const m=META[id.slice(3)];return{t:`Because of ${m?m.title:'your list'}`,e:'From your list',s:''}}
  if(id.startsWith('g:'))return{t:`More ${GN[+id.slice(2)]||'for you'}`,e:'Your taste',s:''}
  if(id.startsWith('trakt:'))return{t:'List',e:'Trakt',s:''}
  if(id.startsWith('p:'))return{t:'',e:'',s:''}
  if(id.startsWith('m:')){const [,mood,kind]=id.split(':'),M=MOODS.find(x=>x.id===mood)||MOODS[0];
    return{t:({movies:M.n,series:M.n+' series',gems:M.n+' hidden gems',classics:M.n+' classics',new:M.n+' · new'}[kind]||M.n),e:'',s:''}}
  if(id==='top10')return{t:'Top 10 Today',e:'',s:''}
  return{t:'Discover',e:'',s:''};
}
