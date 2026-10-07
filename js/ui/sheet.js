'use strict';
/* settings sheet + key gate */
let DIP=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();DIP=e});
addEventListener('appinstalled',()=>{DIP=null;toast('Lumen installed','check')});
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const REGIONS=[['IN','India'],['US','United States'],['GB','United Kingdom'],['CA','Canada'],['AU','Australia'],['AE','UAE'],['SG','Singapore'],['DE','Germany'],['FR','France'],['ES','Spain'],['IT','Italy'],['BR','Brazil'],['MX','Mexico'],['JP','Japan'],['KR','South Korea'],['ZA','South Africa']];
function openSheet(){
  const tu=LS.get('lumen.trakt.user',null),on=T.on;
  const movies=Object.keys(U.seen).length,eps=Object.keys(U.eps).reduce((n,k)=>n+epCount(k),0);
  $('#sheet').innerHTML=`<h2>Settings</h2><p class="lead">${on&&tu?`Signed in to Trakt as ${esc(tu.name)}`:'Local profile · stored on this device'}</p>
    <div class="stats"><div><b>${movies}</b><small>Films</small></div><div><b>${eps}</b><small>Episodes</small></div><div><b>${Object.keys(U.wl).length}</b><small>Saved</small></div></div>
    <div class="card2"><h4>TMDB ${CFG.tmdb?'<span class="pill">Connected</span>':''}</h4><p>Posters, backdrops, logos, cast and streaming info. Paste the v3 API key or the v4 read-access token from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">themoviedb.org/settings/api</a>.</p>
      <label class="field"><span>API key / token</span><input id="sTmdb" type="password" autocomplete="off" value="${esc(CFG.tmdb)}" placeholder="Paste key"></label></div>
    <div class="card2"><h4>Trakt ${on?'<span class="pill">Synced</span>':''}</h4><p>Two-way sync for watchlist, history, episodes and ratings, plus personal picks. Create an app at <a href="https://trakt.tv/oauth/applications/new" target="_blank" rel="noopener">trakt.tv/oauth/applications</a> with redirect URI <b>urn:ietf:wg:oauth:2.0:oob</b>.</p>
      <label class="field"><span>Client ID</span><input id="sTkId" type="text" autocomplete="off" value="${esc(CFG.traktId)}"></label>
      <label class="field"><span>Client secret</span><input id="sTkSec" type="password" autocomplete="off" value="${esc(CFG.traktSecret)}"></label>
      <div class="row">${on?`<button class="btn sm pri" id="sSync">${ic('sync')}Sync now</button><button class="btn sm" id="sTkOut">Disconnect</button>`:`<button class="btn sm pri" id="sTkIn">${ic('sync')}Connect Trakt</button>`}</div></div>
    ${standalone()?'':`<div class="card2"><h4>Install</h4><p>${DIP?'Add Lumen to your home screen for the full-screen app.':'On iPhone: Share, then Add to Home Screen. On Android: menu, then Install app.'}</p>${DIP?'<div class="row"><button class="btn sm pri" id="sInstall">Install app</button></div>':''}</div>`}
    <div class="card2"><label class="field" style="margin-top:0"><span>Streaming region</span><select id="sReg">${REGIONS.map(([c,n])=>`<option value="${c}" ${c===CFG.region?'selected':''}>${n}</option>`).join('')}</select></label>
      <div class="tog" style="margin-top:16px"><b>Trailer behind title pages</b><button class="sw ${CFG.autoplay?'on':''}" id="sAuto" role="switch" aria-checked="${CFG.autoplay}" aria-label="Autoplay trailers"></button></div>
      ${isWeb?'':'<p style="margin-top:10px">Trailers need http. Run <b>serve.bat</b> in the lumen folder and open localhost:4180.</p>'}</div>
    <div class="row"><button class="btn pri" id="sSave">Save</button><button class="btn" id="sClose">Close</button><button class="btn sm" id="sReset" style="margin-left:auto">Reset local data</button></div>`;
  $('#sheetWrap').classList.add('open');
  $('#sAuto').onclick=e=>{CFG.autoplay=!CFG.autoplay;e.currentTarget.classList.toggle('on',CFG.autoplay)};
  $('#sClose').onclick=closeSheet;
  const ins=$('#sInstall');if(ins)ins.onclick=async()=>{DIP.prompt();await DIP.userChoice;DIP=null;openSheet()};
  const keep=()=>{CFG.tmdb=$('#sTmdb').value.trim();CFG.traktId=$('#sTkId').value.trim();CFG.traktSecret=$('#sTkSec').value.trim();CFG.region=$('#sReg').value;saveCfg()};
  $('#sSave').onclick=()=>{keep();memo.clear();toast('Saved');closeSheet();route(true)};
  const tin=$('#sTkIn');if(tin)tin.onclick=()=>{keep();traktConnect()};
  const sy=$('#sSync');if(sy)sy.onclick=()=>{keep();syncNow()};
  const out=$('#sTkOut');if(out)out.onclick=()=>{LS.del('lumen.trakt');LS.del('lumen.trakt.user');paintAvatar();toast('Disconnected from Trakt','x');openSheet()};
  $('#sReset').onclick=()=>{if(confirm('Clear watchlist, history and ratings stored on this device?')){['wl','seen','eps','rate'].forEach(k=>U[k]={});saveU();syncUI();toast('Local data cleared','x');openSheet()}};
}
function closeSheet(){$('#sheetWrap').classList.remove('open')}
function paintAvatar(){
  const b=$('#avatarBtn'),tu=LS.get('lumen.trakt.user',null);
  b.classList.toggle('live',T.on);
  b.innerHTML=T.on&&tu&&tu.avatar?`<img src="${esc(tu.avatar)}" alt="">`:ic('user');
}

/* gate (no TMDB key yet) */
function renderGate(){
  $('#v-home').innerHTML=`<div class="gate"><div><h1>Your screen,<br>lit up.</h1><p>Lumen pulls real posters, backdrops, trailers and cast from TMDB. Paste your API key to begin — it stays in this browser.</p>
    <label class="field"><span>TMDB API key or read-access token</span><input id="gKey" type="password" autocomplete="off" placeholder="Paste here"></label>
    <div class="row"><button class="btn pri" id="gGo">Continue</button><a class="btn" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">Get a free key</a></div></div></div>`;
  const go=async()=>{
    const k=$('#gKey').value.trim();if(!k)return;CFG.tmdb=k;memo.clear();
    try{await tmdb('/configuration');saveCfg();route(true)}catch(e){CFG.tmdb='';toast(e.status===401?'TMDB says that key is invalid':'Couldn’t reach TMDB','x')}
  };
  $('#gGo').onclick=go;$('#gKey').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
}


/* ---------- install banner ---------- */
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function maybeInstallBanner(){
  if(standalone()||$('#instBar')||(LS.get('lumen.inst',0)>Date.now())||!CFG.tmdb)return;
  if(!DIP&&!isIOS)return;
  const b=document.createElement('div');b.id='instBar';b.className='instbar';
  b.innerHTML=`<img src="icons/icon-192.png" alt=""><div><b>Install Lumen</b><small>Full screen and offline</small></div><button class="btn pri sm" id="instGo">${DIP?'Install':'How'}</button><button class="ib" id="instX" aria-label="Dismiss">${ic('x')}</button>`;
  document.body.appendChild(b);
  $('#instX').onclick=()=>{LS.set('lumen.inst',Date.now()+14*864e5);b.classList.add('out');setTimeout(()=>b.remove(),400)};
  $('#instGo').onclick=async()=>{
    if(DIP){DIP.prompt();const r=await DIP.userChoice;DIP=null;b.remove();if(r.outcome==='dismissed')LS.set('lumen.inst',Date.now()+7*864e5)}
    else openModal(`<div class="win"><div class="code"><small>Add to Home Screen</small><p style="margin:14px 0 6px;text-align:left"><b>1.</b> Tap the <b>Share</b> button in Safari<br><b>2.</b> Choose <b>Add to Home Screen</b><br><b>3.</b> Tap <b>Add</b></p><div class="row" style="justify-content:center"><button class="btn pri" data-closemodal>Got it</button></div></div></div>`);
  };
}
addEventListener('beforeinstallprompt',()=>setTimeout(maybeInstallBanner,4000));
if(isIOS)addEventListener('load',()=>setTimeout(maybeInstallBanner,9000));
