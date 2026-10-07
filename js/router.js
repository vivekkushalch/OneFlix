'use strict';
/* =====================================================================
   ROUTER (+ shared-element morph poster → title)
   ===================================================================== */
let TAB='home',NAV=0,EXSIG='';
const TABS=['home','discover','explore','library','feed'];

function route(force){
  NAV++;
  document.body.classList.toggle('nokey',!CFG.tmdb);
  const raw=location.hash.slice(1)||'/',[path,qs]=raw.split('?'),params=new URLSearchParams(qs||'');
  const dm=path.match(/^\/(m|t)\/(\d+)/);
  if(!CFG.tmdb){closeDetail();TABS.forEach(t=>$('#v-'+t).classList.toggle('on',t==='home'));TAB='home';renderGate();return}
  if(dm){
    const type=dm[1]==='m'?'movie':'tv',id=+dm[2],key=type+'-'+id;
    if(!(D.key===key&&$('#detail').classList.contains('open')&&force!==true))openDetail(type,id);
    if(!$('.view.on'))showTab(TAB,true);
    return;
  }
  closeDetail();
  let tab=path.split('/')[1]||'home';
  if(tab==='movies'||tab==='series'){FD.ty=tab==='movies'?'movie':'tv';location.replace('#/feed/trend');return}
  showTab(TABS.includes(tab)?tab:'home',force===true,params,decodeURIComponent(path.split('/')[2]||''));
}
function showTab(tab,force,params,arg){
  const sig=tab==='explore'&&params?(params.get('q')||'')+'|'+(params.get('c')||''):tab==='feed'?(arg||'you')+'|'+FD.ty:'';
  const changed=tab!==TAB||!$('#v-'+tab).classList.contains('on')||force||(tab==='explore'&&sig!==EXSIG)||(tab==='feed'&&sig!==EXSIG);
  const leaving=TAB;TAB=tab;$('#dock').classList.remove('mini');lastY=0;
  if(leaving==='discover'&&tab!=='discover')reelStop();
  document.body.classList.toggle('reelmode',tab==='discover');
  $$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+tab));
  $$('[data-tab]').forEach(a=>{const on=a.dataset.tab===(tab==='feed'?'home':tab);a.classList.toggle('on',on);const s=a.querySelector('[data-ic]');if(s&&a.closest('#dock'))s.innerHTML=ic(s.dataset.ic,on?'solid':'')});
  if(tab==='home'&&window.PERS_DIRTY&&$('#persBox')){window.PERS_DIRTY=false;renderPersonal()}
  if(!changed){if(tab==='discover')reelResume();return}
  const v=$('#v-'+tab);
  if(tab==='home'){if(force||!v.firstChild||v.querySelector('.gate'))renderHome()}
  else if(tab==='feed'){EXSIG=sig;renderFeed(arg||'you')}
  else if(tab==='discover')renderDiscover();
  else if(tab==='explore'){EXSIG=sig;renderExplore(params&&params.get('q'),params&&params.get('c'))}
  else if(tab==='library')renderLibrary();
  window.scrollTo(0,0);
}
function go(h,imgEl){
  if(go.busy||!document.startViewTransition||matchMedia('(prefers-reduced-motion:reduce)').matches){location.hash=h;return}
  go.busy=true;
  const det=$('#detail');det.classList.add('instant');
  $$('[style*="view-transition-name"]').forEach(n=>n.style.viewTransitionName='');
  if(imgEl)imgEl.style.viewTransitionName='hero';
  if(location.hash!=='#'+h)history.pushState(null,'','#'+h);
  let vt;
  try{vt=document.startViewTransition(()=>{if(imgEl)imgEl.style.viewTransitionName='';route(true);const bg=$('#detail .d-bg');if(bg)bg.style.viewTransitionName='hero'})}
  catch{go.busy=false;det.classList.remove('instant');route(true);return}
  vt.ready.catch(()=>{});
  vt.finished.catch(()=>{}).finally(()=>{go.busy=false;$$('[style*="view-transition-name"]').forEach(n=>n.style.viewTransitionName='');setTimeout(()=>det.classList.remove('instant'),50)});
}
addEventListener('hashchange',()=>route());

