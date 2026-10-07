'use strict';
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

