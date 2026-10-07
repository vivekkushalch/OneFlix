'use strict';
/* =====================================================================
   EVENTS / BOOT
   ===================================================================== */
let lpFired=false,LP=null;
document.addEventListener('pointerdown',e=>{
  const t=e.target.closest&&e.target.closest('.tile,.spotc,.lrow');if(!t||e.target.closest('.qa'))return;
  LP={x:e.clientX,y:e.clientY,t:setTimeout(()=>{lpFired=true;peekOpen(t.dataset.key)},520)};
},{passive:true});
document.addEventListener('pointermove',e=>{if(LP&&Math.hypot(e.clientX-LP.x,e.clientY-LP.y)>10){clearTimeout(LP.t);LP=null}},{passive:true});
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>{if(LP){clearTimeout(LP.t);LP=null}},{passive:true}));
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.tile,.rc'))e.preventDefault()});
function hideTile(key){
  U.skip[key]=Date.now();learn(key,-1.2);saveU();vib(14);toast('Less like this','x');
  $$(`[data-key="${key}"]`).forEach(t=>{if(t.classList.contains('tile')||t.classList.contains('spotc')||t.classList.contains('lrow')){t.classList.add('gone');setTimeout(()=>t.remove(),420)}});
}

document.addEventListener('click',e=>{
  const t=e.target;let el;
  if(lpFired){lpFired=false;e.preventDefault();e.stopPropagation();return}
  if(t.closest('.brand')&&TAB==='home'&&!$('#detail').classList.contains('open')){e.preventDefault();return shuffleHome()}
  if(t.closest('#moodPill')){return $('#moodBar').classList.toggle('open')}
  if((el=t.closest('[data-mood]')))return pickMood(el.dataset.mood);
  if(t.closest('[data-peek-x]'))return peekClose();
  if(t.closest('[data-peek-skip]')){const k=PK.key;peekClose();return hideTile(k)}
  if(t.closest('[data-peek-tr]')){const k=PK.key,mm=META[k];peekClose();lite(mm).then(L=>openTrailer(L.vids,mm.title));return}
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
  if((el=t.closest('a.tile,a.wide,a.spotc,a.lrow'))&&!e.metaKey&&!e.ctrlKey){e.preventDefault();return go(el.getAttribute('href').slice(1),el.querySelector('img'))}
});
document.addEventListener('dblclick',e=>{if(e.target.closest('#tbox'))toggleFull()});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select'))return;
  if(e.key==='Escape'){
    if($('#peek')&&$('#peek').classList.contains('open'))peekClose();
    else if($('#modal').classList.contains('open'))closeModal();
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

function hideBoot(){const b=$('#boot');if(!b)return;b.classList.add('gone');setTimeout(()=>b.remove(),700)}
function boot(){
  if(standalone())document.body.classList.add('standalone');
  addEventListener('offline',()=>toast('You’re offline — showing saved content','clock'));
  addEventListener('online',()=>toast('Back online','check'));
  setTimeout(hideBoot,2200);
  $$('#links [data-ic],#dock [data-ic]').forEach(s=>s.innerHTML=ic(s.dataset.ic));
  paintAvatar();
  route(true);
  if(T.on&&CFG.tmdb)syncNow(true);
}
boot();
