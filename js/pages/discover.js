'use strict';
/* =====================================================================
   DISCOVER — full-screen reel, one title at a time
   ===================================================================== */
const RL={items:[],i:-1,tp:null,busy:false,io:null,muted:true,act:0,last:0,tm:0};
const LITE={};
const lite=it=>LITE[it.key]||(LITE[it.key]=tmdb(`/${it.type}/${it.id}`,{append_to_response:'images,videos',include_image_language:'en,null'}).then(d=>{
  const logo=(d.images&&d.images.logos||[]).filter(l=>l.iso_639_1==='en'||!l.iso_639_1).sort((a,b)=>b.vote_average-a.vote_average)[0];
  return{logo:logo&&logo.file_path,vids:ytIds(d.videos&&d.videos.results),genres:(d.genres||[]).map(g=>g.name),run:d.runtime||(d.episode_run_time&&d.episode_run_time[0])||0,seasons:d.number_of_seasons||0,vote:d.vote_average}
}).catch(()=>({logo:null,vids:[],genres:[]})));
function rcard(it,i){
  const loved=!!U.love[it.key],saved=inWL(it.key);
  return `<article class="rc" data-i="${i}" data-key="${it.key}">
    <div class="rc-art"><img src="${img(it.bd||it.pp,'w1280')}" alt="" ${i<2?'fetchpriority="high"':'loading="lazy"'} draggable="false"><div class="tr"></div></div><div class="rc-shade"></div>
    <div class="rc-info"><div class="rc-logo"><h2>${esc(it.title)}</h2></div><div class="rc-meta"></div></div>
    <div class="rc-act">
      <button class="${loved?'on':''}" data-love="${it.key}" aria-label="Love">${ic('heart',loved?'solid':'')}</button>
      <button class="${saved?'on':''}" data-wl="${it.key}" data-s="${saved?1:0}" aria-label="Save">${ic(saved?'check':'plus')}</button>
      <button data-rskip aria-label="Not for me">${ic('x')}</button>
      <a href="${href(it)}" aria-label="Details">${ic('info')}</a>
      <button data-rmute class="rm" aria-label="Sound" hidden>${ic('mute')}</button>
    </div><div class="burst">${ic('heart','solid')}</div></article>`;
}
async function renderDiscover(){
  const v=$('#v-discover');
  if(v.dataset.ready){reelResume();return}
  v.dataset.ready=1;v.innerHTML=`<div class="reel" id="reel"></div><div class="reel-hint" id="rhint">${ic('chev')}</div>`;
  const reel=$('#reel');
  RL.io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)reelActivate(+e.target.dataset.i)}),{root:reel,threshold:.62});
  await reelMore();
}
async function reelMore(){
  if(RL.busy)return;RL.busy=true;
  try{
    const items=await engineTake(8,'all'),base=RL.items.length;RL.items.push(...items);
    $('#reel').insertAdjacentHTML('beforeend',items.map((it,k)=>rcard(it,base+k)).join(''));
    lazy();$$('#reel .rc').slice(base).forEach(el=>RL.io.observe(el));
  }catch(e){}
  RL.busy=false;
}
async function reelActivate(i){
  if(i===RL.i||TAB!=='discover')return;
  reelStop();RL.i=i;const it=RL.items[i];if(!it)return;
  $$('#reel .rc').forEach(c=>c.classList.toggle('on',+c.dataset.i===i));
  const card=$(`#reel .rc[data-i="${i}"]`);
  $('#rhint')&&$('#rhint').classList.add('gone');
  [1,2,3].forEach(d=>{const n=RL.items[i+d];if(n){lite(n);const im=new Image();im.src=img(n.bd||n.pp,'w1280')}});
  if(i>=RL.items.length-3)reelMore();
  const L=await lite(it);if(RL.i!==i)return;
  const lg=$('.rc-logo',card),mt=$('.rc-meta',card);
  if(L.logo){const im=new Image();im.className='lg';im.alt=it.title;im.src=img(L.logo,'w500');im.onload=()=>{if(RL.i===i){lg.innerHTML='';lg.appendChild(im);requestAnimationFrame(()=>im.classList.add('ld'))}}}
  const bits=[it.year,(L.genres[0]||''),L.run?fmtRun(L.run):(L.seasons?L.seasons+' season'+(L.seasons>1?'s':''):''),L.vote?'★ '+L.vote.toFixed(1):''].filter(Boolean);
  mt.innerHTML=bits.map(esc).join(' <i class="dot"></i> ');
  if(L.vids.length&&isWeb&&CFG.autoplay)setTimeout(()=>{if(RL.i===i)reelPlay(card,L.vids,i)},700);
}
function reelPlay(card,vids,i){
  const tr=$('.tr',card);if(!tr)return;
  ytMount(tr,vids,{mute:true,loop:true,max:3,timeout:9000,
    playing:p=>{if(RL.i!==i)return;if(!RL.muted){try{p.unMute();p.setVolume(100)}catch{}}setTimeout(()=>{tr.classList.add('on');const m=$('.rm',card);if(m){m.hidden=false;m.innerHTML=ic(RL.muted?'mute':'vol')}},700)},
    fail:()=>{tr.innerHTML=''}
  }).then(p=>{if(RL.i===i)RL.tp=p;else if(p&&p.destroy)try{p.destroy()}catch{}});
}
function reelStop(){if(RL.tp&&RL.tp.destroy)try{RL.tp.destroy()}catch{}RL.tp=null;$$('#reel .tr').forEach(t=>{t.classList.remove('on');t.innerHTML=''})}
function reelResume(){const i=RL.i;RL.i=-1;if(i>=0)reelActivate(i)}
function reelNext(){const c=$(`#reel .rc[data-i="${RL.i+1}"]`);if(c)c.scrollIntoView({behavior:'smooth'})}
function reelLove(key,burstCard){
  const on=!U.love[key];
  if(on){U.love[key]=Date.now();learn(key,2)}else{delete U.love[key];learn(key,-2)}
  saveU();vib(on?[8,30,8]:6);
  $$(`[data-love="${key}"]`).forEach(b=>paintLove(b,on,true));
  if(on&&burstCard){burstCard.classList.remove('bursting');void burstCard.offsetWidth;burstCard.classList.add('bursting')}
}
function reelSkip(key){
  U.skip[key]=Date.now();learn(key,-1.3);saveU();vib(12);toast('Less like this','x');reelNext();
}
function reelTap(card){
  const now=Date.now();
  if(now-RL.tm<300){clearTimeout(RL.tt);RL.tm=0;reelLove(card.dataset.key,card);return}
  RL.tm=now;RL.tt=setTimeout(()=>{
    const on=card.classList.toggle('cine');
    if(on&&RL.tp){RL.muted=false;try{RL.tp.unMute();RL.tp.setVolume(100)}catch{}const m=$('.rm',card);if(m)m.innerHTML=ic('vol')}
  },280);
}

