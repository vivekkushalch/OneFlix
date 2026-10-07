'use strict';
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

