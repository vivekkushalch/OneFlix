'use strict';
/* ---------- config ---------- */
const CFG=Object.assign({
  tmdb:'',                 // TMDB v3 key OR v4 read-access token
  traktId:'',traktSecret:'',
  region:(navigator.language.split('-')[1]||'US').toUpperCase(),
  autoplay:true
},LS.get('lumen.cfg',{}));
const saveCfg=()=>LS.set('lumen.cfg',CFG);

/* ---------- TMDB ---------- */
const TM='https://api.themoviedb.org/3',IMG='https://image.tmdb.org/t/p/';
const img=(p,s='w342')=>p?IMG+s+p:'';
const memo=new Map();
function tmdb(path,params={}){
  const k=path+'?'+new URLSearchParams(params);
  if(memo.has(k))return memo.get(k);
  const q=new URLSearchParams({language:'en-US',...params}),h={};
  if(CFG.tmdb.length>40)h.Authorization='Bearer '+CFG.tmdb;else q.set('api_key',CFG.tmdb);
  const p=fetch(`${TM}${path}?${q}`,{headers:h}).then(r=>{if(!r.ok){const e=new Error('TMDB '+r.status);e.status=r.status;throw e}return r.json()});
  memo.set(k,p);p.catch(()=>memo.delete(k));return p;
}
const META=LS.get('lumen.meta',{});
let metaT;
const persistMeta=()=>{clearTimeout(metaT);metaT=setTimeout(()=>{const ks=Object.keys(META);if(ks.length>1600)ks.slice(0,ks.length-1200).forEach(k=>delete META[k]);LS.set('lumen.meta',META)},900)};
function norm(r,type){
  type=type||(r.media_type==='tv'||(!r.title&&r.name)?'tv':'movie');
  const it={key:type+'-'+r.id,id:r.id,type,title:r.title||r.name||'Untitled',year:(r.release_date||r.first_air_date||'').slice(0,4),
    pp:r.poster_path||null,bd:r.backdrop_path||null,vote:r.vote_average||0,date:r.release_date||r.first_air_date||'',ov:r.overview||'',g:r.genre_ids||(r.genres||[]).map(x=>x.id)};
  const o=META[it.key]||{};
  META[it.key]={key:it.key,id:it.id,type,title:it.title,year:it.year||o.year||'',pp:it.pp||o.pp||null,bd:it.bd||o.bd||null,vote:it.vote||o.vote||0,g:(it.g&&it.g.length?it.g:o.g)||[]};
  persistMeta();return it;
}
const lst=(res,type)=>(res.results||[]).filter(r=>r.media_type!=='person'&&r.poster_path).map(r=>norm(r,type));

/* ---------- user state (local; mirrored to Trakt when connected) ---------- */
const U=Object.assign({wl:{},seen:{},eps:{},rate:{},love:{},skip:{},prof:{}},LS.get('lumen.user',{}));
const saveU=()=>LS.set('lumen.user',U);
const inWL=k=>!!U.wl[k];
const epsOf=k=>U.eps[k]||(U.eps[k]={});
const epCount=k=>Object.keys(U.eps[k]||{}).filter(x=>!x.startsWith('0-')).length;

/* ---------- taste profile: every action nudges genre weights ---------- */
function learn(key,w){const m=META[key];if(!m||!m.g||!m.g.length)return;m.g.forEach(g=>{U.prof[g]=clamp((U.prof[g]||0)+w,-6,12)})}
const affinity=it=>{const g=it.g&&it.g.length?it.g:((META[it.key]||{}).g||[]);return g.length?g.reduce((s,x)=>s+(U.prof[x]||0),0)/g.length:0};
const topGenres=n=>Object.entries(U.prof).filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([g])=>+g);
const logoMemo={};
function logoOf(it){
  if(!logoMemo[it.key])logoMemo[it.key]=tmdb(`/${it.type}/${it.id}/images`,{include_image_language:'en,null'}).then(r=>{const l=(r.logos||[]).filter(x=>x.iso_639_1==='en'||!x.iso_639_1).sort((a,b)=>b.vote_average-a.vote_average)[0];return l?l.file_path:null}).catch(()=>null);
  return logoMemo[it.key];
}

