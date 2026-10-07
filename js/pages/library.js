'use strict';
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

