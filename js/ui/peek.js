'use strict';
/* =====================================================================
   PEEK — long-press any poster for a quick look.
   The complexity (synopsis, trailer, love, "less like this") stays
   hidden until you ask for it with one gesture.
   ===================================================================== */
const PK={key:null};
async function peekOpen(key){
  const m=META[key];if(!m)return;
  PK.key=key;vib(14);
  let w=$('#peek');if(!w){w=document.createElement('div');w.id='peek';w.className='peek-wrap';document.body.appendChild(w)}
  const wl=inWL(key),lv=!!U.love[key];
  w.innerHTML=`<div class="peek-scrim" data-peek-x></div>
    <div class="peek" role="dialog" aria-label="${esc(m.title)}">
      <div class="pk-art"><img src="${img(m.bd||m.pp,'w780')}" alt="" draggable="false"><div class="pk-logo" data-key="${key}"><b>${esc(m.title)}</b></div></div>
      <div class="pk-body"><div class="pk-meta" id="pkMeta">${m.year||''}</div><p class="pk-ov" id="pkOv"></p>
        <div class="pk-act">
          <button class="btn pri" id="pkTr" data-peek-tr hidden>${ic('play')}Trailer</button>
          <a class="btn sq" href="${href(m)}" aria-label="Details">${ic('info')}</a>
          <button class="btn sq ${wl?'on':''}" data-wl="${key}" data-s="${wl?1:0}" aria-label="Save">${ic(wl?'check':'plus')}</button>
          <button class="btn sq ${lv?'on':''}" data-love="${key}" aria-label="Love">${ic('heart',lv?'solid':'')}</button>
          <button class="btn sq" data-peek-skip aria-label="Less like this">${ic('x')}</button>
        </div></div></div>`;
  requestAnimationFrame(()=>w.classList.add('open'));
  logoInto($('.pk-logo',w));
  try{
    const L=await lite(m);if(PK.key!==key)return;
    const bits=[m.year,L.genres[0],L.run?fmtRun(L.run):(L.seasons?L.seasons+' season'+(L.seasons>1?'s':''):''),L.vote?'★ '+L.vote.toFixed(1):''].filter(Boolean);
    $('#pkMeta').textContent=bits.join('  ·  ');$('#pkOv').textContent=L.ov||'';
    if(L.vids.length)$('#pkTr').hidden=false;
  }catch{}
}
function peekClose(){const w=$('#peek');if(!w)return;w.classList.remove('open');PK.key=null;setTimeout(()=>{if(!w.classList.contains('open'))w.innerHTML=''},500)}
addEventListener('hashchange',peekClose);
