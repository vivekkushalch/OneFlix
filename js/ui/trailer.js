'use strict';
/* =====================================================================
   TRAILER POP-UP (bare) — with pop-out + full-screen fallbacks
   ===================================================================== */
const TR={ids:[],i:0,p:null,title:''};
function openTrailer(ids,title){
  TR.ids=ids;TR.i=0;TR.title=title;
  openModal(`<div class="win"><div class="box" id="tbox"><div class="fail" id="tfail"><b>Blocked by the studio</b><p>${isWeb?'It plays fine in its own window.':'Serve the app over http (serve.bat) to play here. It plays fine in its own window.'}</p>
    <div class="row" style="justify-content:center"><button class="btn pri sm" data-pop="0">${ic('play')}Pop-up</button><button class="btn sm" data-pop="1">${ic('expand')}Full-screen</button><a class="btn sm sq" id="tyt" target="_blank" rel="noopener" aria-label="New tab">${ic('ext')}</a></div></div></div></div>
    <div class="mtools"><button class="ib" data-pop="0" aria-label="Pop-up window">${ic('ext')}</button><button class="ib" data-fs aria-label="Full screen">${ic('expand')}</button><button class="ib" data-closemodal aria-label="Close">${ic('x')}</button></div>`,killTrailer);
  mountTrailer();
}
function mountTrailer(){
  const box=$('#tbox');if(!box)return;
  if(TR.p&&TR.p.destroy)try{TR.p.destroy()}catch{}
  const ids=TR.ids.slice(TR.i);
  ytMount(box,ids,{controls:1,max:4,fail:why=>{const f=$('#tfail');if(!f||why==='timeout')return;f.classList.add('show');$('#tyt').href='https://www.youtube.com/watch?v='+ids[0]}}).then(p=>TR.p=p);
  if(!isWeb)setTimeout(()=>{const f=$('#tfail');if(f){f.classList.add('show');$('#tyt').href='https://www.youtube.com/watch?v='+ids[0]}},400);
}
function popTrailer(full){
  const id=TR.ids[TR.i]||TR.ids[0];if(!id)return;
  const sw=screen.availWidth,sh=screen.availHeight,w=full?sw:Math.min(1180,sw-80),h=full?sh:Math.round(w*9/16)+60,l=full?0:Math.round((sw-w)/2),t=full?0:Math.round((sh-h)/2);
  const win=window.open('https://www.youtube.com/watch?v='+id,'lumenTrailer',`popup=yes,width=${w},height=${h},left=${l},top=${t}`);
  if(!win)window.open('https://www.youtube.com/watch?v='+id,'_blank');
}
function toggleFull(){
  const box=$('#tbox');if(!box)return;
  if(document.fullscreenElement)document.exitFullscreen();
  else if(box.requestFullscreen)box.requestFullscreen().catch(()=>{});
  else if(box.webkitRequestFullscreen)box.webkitRequestFullscreen();
}
function killTrailer(){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});if(TR.p&&TR.p.destroy)try{TR.p.destroy()}catch{}TR.p=null}
let modalClose=null;
function openModal(html,onclose){const m=$('#modal');m.innerHTML=html;m.classList.add('open');modalClose=onclose||null}
function closeModal(){const m=$('#modal');if(!m.classList.contains('open'))return;m.classList.remove('open');if(modalClose)modalClose();modalClose=null;setTimeout(()=>{if(!m.classList.contains('open'))m.innerHTML=''},350)}

