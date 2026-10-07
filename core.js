'use strict';
/* =====================================================================
   LUMEN — TMDB (catalogue, art, logos, trailers) + Trakt (sync & recs)
   Keys live in localStorage (avatar ▸ Settings). Serve over http for
   trailers: run serve.bat, or any static server.
   ===================================================================== */

/* ---------- utils ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},
  del(k){try{localStorage.removeItem(k)}catch{}}
};
const iso=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
const fmtRun=m=>m?(m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+'m'):'';
const fmtDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
const money=n=>n?'$'+(n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?Math.round(n/1e6)+'M':n.toLocaleString()):'';
const isWeb=/^https?:/.test(location.protocol);

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

/* ---------- Trakt ---------- */
const TK='https://api.trakt.tv';
const T={
  get tok(){return LS.get('lumen.trakt',null)},
  get on(){return !!(this.tok&&CFG.traktId)},
  async req(path,o={}){
    let t=this.tok;if(!t)throw new Error('Not connected');
    if(Date.now()/1000>t.created_at+t.expires_in-86400)t=await this.refresh(t);
    const r=await fetch(TK+path,{method:o.method||'GET',headers:{'Content-Type':'application/json','trakt-api-version':'2','trakt-api-key':CFG.traktId,Authorization:'Bearer '+t.access_token},body:o.body?JSON.stringify(o.body):undefined});
    if(!r.ok)throw new Error('Trakt '+r.status);
    return r.status===204?null:r.json();
  },
  async refresh(t){
    const r=await fetch(TK+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:t.refresh_token,client_id:CFG.traktId,client_secret:CFG.traktSecret,redirect_uri:'urn:ietf:wg:oauth:2.0:oob',grant_type:'refresh_token'})});
    if(!r.ok){LS.del('lumen.trakt');throw new Error('Trakt session expired — reconnect')}
    const n=await r.json();LS.set('lumen.trakt',n);return n;
  }
};
const tkIds=it=>({ids:{tmdb:it.id}});
const tkBody=(it,extra={})=>it.type==='movie'?{movies:[{...tkIds(it),...extra}]}:{shows:[{...tkIds(it),...extra}]};
function push(path,body){if(!T.on)return;T.req(path,{method:'POST',body}).catch(e=>toast('Trakt sync failed · '+e.message,'x'))}

async function traktPull(){
  const [wm,ws,wl,rt]=await Promise.all([T.req('/sync/watched/movies'),T.req('/sync/watched/shows'),T.req('/sync/watchlist'),T.req('/sync/ratings')]);
  U.seen={};U.eps={};U.wl={};U.rate={};
  const stub=(type,x)=>{const id=x.ids&&x.ids.tmdb;if(!id)return null;const key=type+'-'+id;
    if(!META[key])META[key]={key,id,type,title:x.title,year:String(x.year||''),pp:null,bd:null,vote:0};return key};
  wm.forEach(x=>{const k=stub('movie',x.movie);if(k)U.seen[k]=Date.parse(x.last_watched_at)});
  ws.forEach(x=>{const k=stub('tv',x.show);if(!k)return;const o={};x.seasons.forEach(s=>s.episodes.forEach(e=>o[s.number+'-'+e.number]=Date.parse(e.last_watched_at)));U.eps[k]=o});
  wl.forEach(x=>{const m=x.movie?['movie',x.movie]:x.show?['tv',x.show]:null;if(!m)return;const k=stub(m[0],m[1]);if(k)U.wl[k]=Date.parse(x.listed_at)});
  rt.forEach(x=>{const m=x.movie?['movie',x.movie]:x.show?['tv',x.show]:null;if(!m)return;const k=stub(m[0],m[1]);if(k)U.rate[k]=x.rating});
  saveU();persistMeta();
}
async function traktUser(){
  try{const s=await T.req('/users/settings');LS.set('lumen.trakt.user',{name:s.user.username,avatar:s.user.images&&s.user.images.avatar&&s.user.images.avatar.full})}catch{}
}
async function syncNow(quiet){
  if(!T.on)return;
  try{await traktPull();syncUI();if(!quiet)toast('Synced with Trakt','sync');hydrate(Object.keys({...U.wl,...U.seen,...U.eps,...U.rate}))}
  catch(e){toast(e.message,'x')}
}
async function traktConnect(){
  if(!CFG.traktId||!CFG.traktSecret)return toast('Save your Trakt client ID & secret first','x');
  let dc;
  try{const r=await fetch(TK+'/oauth/device/code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CFG.traktId})});if(!r.ok)throw 0;dc=await r.json()}
  catch{return toast('Trakt rejected the client ID','x')}
  let stop=false;
  openModal(`<div class="win"><div class="code"><small>Authorize Lumen on Trakt</small><div class="big">${esc(dc.user_code)}</div>
    <p>Open <b>${esc(dc.verification_url.replace('https://',''))}</b>, enter this code and approve. This window closes by itself.</p>
    <div class="row" style="justify-content:center"><a class="btn pri" href="${esc(dc.verification_url)}" target="_blank" rel="noopener">Open Trakt</a><button class="btn" data-closemodal>Cancel</button></div></div></div>`,()=>{stop=true});
  const end=Date.now()+dc.expires_in*1000;let iv=dc.interval*1000;
  while(!stop&&Date.now()<end){
    await sleep(iv);if(stop)break;
    const r=await fetch(TK+'/oauth/device/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:dc.device_code,client_id:CFG.traktId,client_secret:CFG.traktSecret})});
    if(r.status===200){LS.set('lumen.trakt',await r.json());closeModal();toast('Trakt connected','check');await traktUser();paintAvatar();await syncNow(true);toast('List synced from Trakt','sync');if($('#sheetWrap').classList.contains('open'))openSheet();return}
    if(r.status===429)iv+=1000;else if(r.status!==400)break;
  }
  if(!stop){closeModal();toast('Trakt authorization expired or was denied','x')}
}

/* ---------- state actions ---------- */
function toggleWL(key){
  const it=META[key];if(!it)return;
  if(U.wl[key]){delete U.wl[key];push('/sync/watchlist/remove',tkBody(it));toast('Removed from watchlist','x')}
  else{U.wl[key]=Date.now();learn(key,1);push('/sync/watchlist',tkBody(it));toast(`${it.title} saved to watchlist`,'bookmark')}
  saveU();syncUI();
}
function toggleSeen(key){
  const it=META[key];if(!it||it.type!=='movie')return;
  if(U.seen[key]){delete U.seen[key];push('/sync/history/remove',tkBody(it));toast('Unmarked','x')}
  else{U.seen[key]=Date.now();learn(key,1.5);delete U.wl[key];push('/sync/history',tkBody(it,{watched_at:new Date().toISOString()}));toast(`Checked in · ${it.title}`)}
  saveU();syncUI();
}
function setEps(key,list,on){
  const it=META[key];if(!it||!list.length)return;const w=epsOf(key),now=Date.now(),bySeason={};
  list.forEach(([s,e])=>{if(on)w[s+'-'+e]=now;else delete w[s+'-'+e];(bySeason[s]=bySeason[s]||[]).push(on?{number:e,watched_at:new Date().toISOString()}:{number:e})});
  if(on){delete U.wl[key];learn(key,.35)}
  push(on?'/sync/history':'/sync/history/remove',{shows:[{...tkIds(it),seasons:Object.entries(bySeason).map(([n,episodes])=>({number:+n,episodes}))}]});
  saveU();syncUI();
}
function setRate(key,n){
  const it=META[key];if(!it)return;
  if(!n||U.rate[key]===n){delete U.rate[key];push('/sync/ratings/remove',tkBody(it))}
  else{U.rate[key]=n;learn(key,(n-5)/3);push('/sync/ratings',tkBody(it,{rating:n}));toast(`Rated ${n}/10`,'star')}
  saveU();syncUI();
}
function nextUp(key,d){
  const w=U.eps[key]||{},na=d.next_episode_to_air;
  for(const s of d.seasons||[]){if(s.season_number<1)continue;
    for(let e=1;e<=s.episode_count;e++){
      if(na&&s.season_number===na.season_number&&e>=na.episode_number)return null;
      if(!w[s.season_number+'-'+e])return{s:s.season_number,e};
    }}
  return null;
}
async function checkInNext(key){
  const it=META[key];if(!it)return;
  try{const d=await tmdb('/tv/'+it.id),n=nextUp(key,d);
    if(!n)return toast('You’re all caught up','check');
    setEps(key,[[n.s,n.e]],true);toast(`Checked in · S${n.s} E${n.e} of ${it.title}`);
  }catch{toast('Couldn’t reach TMDB','x')}
}

/* ---------- helpers ---------- */
function toast(msg,icon='check'){
  const t=document.createElement('div');t.className='toast';t.innerHTML=`<span class="ti">${ic(icon)}</span><span>${esc(msg)}</span>`;
  const box=$('#toasts');box.appendChild(t);while(box.children.length>2)box.firstChild.remove();
  setTimeout(()=>t.remove(),3600);
}
async function hydrate(keys){
  const need=keys.filter(k=>META[k]&&!META[k].pp).slice(0,60);let n=0;
  const run=async()=>{while(need.length){const k=need.shift(),m=META[k];try{const d=await tmdb(`/${m.type}/${m.id}`);norm(d,m.type);n++}catch{}}};
  await Promise.all([run(),run(),run(),run(),run()]);
  if(n&&TAB==='library')renderLibrary();
}
const lazy=()=>$$('img:not([data-b])').forEach(i=>{i.dataset.b=1;if(i.complete&&i.naturalWidth)i.classList.add('ld');else i.addEventListener('load',()=>i.classList.add('ld'),{once:true})});
const colorMemo={};
async function accentFor(path){
  if(!path)return null;if(colorMemo[path]!==undefined)return colorMemo[path];
  return colorMemo[path]=await new Promise(res=>{
    const i=new Image();i.crossOrigin='anonymous';
    i.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.drawImage(i,0,0,32,32);const d=x.getImageData(0,0,32,32).data;
      let r=0,g=0,b=0,w=0;
      for(let k=0;k<d.length;k+=4){const R=d[k],G=d[k+1],B=d[k+2],mx=Math.max(R,G,B),mn=Math.min(R,G,B),s=mx?(mx-mn)/mx:0,l=(mx+mn)/510,wt=s*s*(1-Math.abs(l-.5)*1.7)+.004;r+=R*wt;g+=G*wt;b+=B*wt;w+=wt}
      let c3=[r/w,g/w,b/w];const m=(c3[0]+c3[1]+c3[2])/3;
      if(Math.max(...c3)-Math.min(...c3)<22)return res(null);
      c3=c3.map(v=>clamp(m+(v-m)*1.35,0,255));const mx=Math.max(...c3),k2=mx<200?200/mx:1;
      res(c3.map(v=>Math.round(clamp(v*k2,0,255))))}catch{res(null)}};
    i.onerror=()=>res(null);i.src=img(path,'w92');
  });
}
const DEF_TINT='12 12 14';
const setTint=(el,c)=>el.style.setProperty('--tint',c?c.map(v=>Math.round(12+v*.16)).join(' '):DEF_TINT);


/* ---------- YouTube (low level) ---------- */
let ytLoad;
function loadYT(){
  return ytLoad||(ytLoad=new Promise(res=>{
    if(window.YT&&YT.Player)return res(true);
    const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>res(false);
    window.onYouTubeIframeAPIReady=()=>res(true);document.head.appendChild(s);
    setTimeout(()=>res(!!(window.YT&&YT.Player)),9000);
  }));
}
async function ytMount(host,ids,o={}){
  if(!await loadYT()){o.fail&&o.fail('api');return null}
  ids=ids.slice(0,o.max||4);                       // studios often block embeds (error 150) — try a few, then hand over
  const mount=document.createElement('div');host.appendChild(mount);
  let i=0,started=false,timer;
  const vars={autoplay:1,mute:o.mute?1:0,controls:o.controls?1:0,rel:0,modestbranding:1,playsinline:1,iv_load_policy:3,fs:o.controls?1:0,disablekb:o.controls?0:1,enablejsapi:1};
  if(isWeb)vars.origin=location.origin;
  const p=new YT.Player(mount,{videoId:ids[0],host:'https://www.youtube-nocookie.com',playerVars:vars,events:{
    onReady:e=>{if(o.mute)e.target.mute();e.target.playVideo();if(o.timeout)timer=setTimeout(()=>{if(!started)o.fail&&o.fail('timeout')},o.timeout)},
    onStateChange:e=>{
      if(e.data===1&&!started){started=true;clearTimeout(timer);o.playing&&o.playing(p)}
      if(e.data===0&&o.loop){p.seekTo(0);p.playVideo()}
    },
    onError:()=>{clearTimeout(timer);if(ids[i+1]){i++;p.loadVideoById(ids[i])}else o.fail&&o.fail('error',ids[i])}
  }});
  return p;
}
function ytIds(vs=[]){
  const yt=vs.filter(v=>v.site==='YouTube');
  const rank=v=>(v.type==='Trailer'?0:v.type==='Teaser'?2:4)+(v.official?0:1);
  return yt.sort((a,b)=>rank(a)-rank(b)).map(v=>v.key);
}
