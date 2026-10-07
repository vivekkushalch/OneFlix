'use strict';
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


