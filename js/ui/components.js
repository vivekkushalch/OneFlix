'use strict';
/* =====================================================================
   LUMEN UI — mobile-first. Needs icons.js, core.js, sheet.js
   Home = a wall + feed tabs · Discover = full-screen reel that learns
   ===================================================================== */
const href=it=>`#/${it.type==='tv'?'t':'m'}/${it.id}`;
const vib=n=>{try{navigator.vibrate&&navigator.vibrate(n)}catch{}};
const GN={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Sci-Fi',53:'Thriller',10752:'War',37:'Western',10759:'Action',10765:'Sci-Fi',10768:'War'};
const GENRE_POOL=[28,12,16,35,80,99,18,14,27,9648,10749,878,53,37];

/* ---------- save button (animated) ---------- */
const qaBtn=key=>{const on=inWL(key);return `<button class="qa ${on?'on':''}" data-wl="${key}" data-s="${on?1:0}" aria-label="Save">${ic(on?'check':'plus')}</button>`};
function paintSave(b,on,anim){
  b.dataset.s=on?1:0;
  if(b.classList.contains('qa')||b.classList.contains('btn'))b.classList.toggle('on',on);
  const bm=b.dataset.ico==='bm';
  b.innerHTML=bm?ic('bookmark',on?'solid pop':''):ic(on?'check':'plus',on&&anim?'draw':'');
  if(anim){b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),650)}
}
function paintLove(b,on,anim){b.classList.toggle('on',on);b.innerHTML=ic('heart',on?'solid '+(anim?'pop':''):'')}
function syncUI(){
  $$('[data-wl]').forEach(b=>{const on=inWL(b.dataset.wl);if(b.dataset.s===undefined||(+b.dataset.s===1)!==on)paintSave(b,on,b.dataset.s!==undefined)});
  $$('[data-love]').forEach(b=>{const on=!!U.love[b.dataset.love];if(b.classList.contains('on')!==on)paintLove(b,on,true)});
  if(D.key&&D.data)paintActions();
  if(TAB==='library')renderLibrary();
  if(TAB==='home')refreshCont();
}

/* ---------- tiles + the wall (shortest-column masonry, no layout jumps) ---------- */
function tile(it,o={}){
  const bd=o.kind==='bd'&&it.bd,src=bd?img(it.bd,'w500'):img(it.pp,'w342');
  let tag='';if(o.date&&it.date){const d=new Date(it.date+'T12:00:00');tag=`<span class="tag">${d.toLocaleString('en-US',{month:'short'})} ${d.getDate()}</span>`}
  return `<a class="tile ${bd?'bdk':''}" href="${href(it)}" data-key="${it.key}" style="aspect-ratio:${bd?'16/9':'2/3'};--d:${o.d||0}" aria-label="${esc(it.title)}">${src?`<img src="${src}" alt="" loading="lazy" decoding="async" draggable="false">`:`<span class="nop">${esc(it.title)}</span>`}<span class="ov"></span><span class="tt">${esc(it.title)}<small>${it.year||''}</small></span>${tag}${qaBtn(it.key)}</a>`;
}
async function logoInto(el){
  const m=META[el.dataset.key];if(!m)return;const p=await logoOf(m);if(!p||!el.isConnected)return;
  const i=new Image();i.className='lg';i.alt='';i.draggable=false;i.src=img(p,'w300');
  i.onload=()=>{el.appendChild(i);el.classList.add('hasl');requestAnimationFrame(()=>i.classList.add('ld'))};
}
class Wall{
  constructor(root){
    this.root=root;this.list=[];this.n=0;root.classList.add('wall');
    this.io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){this.io.unobserve(e.target);logoInto(e.target)}}),{rootMargin:'240px'});
    this.build();
    this.rs=()=>{clearTimeout(this.t);this.t=setTimeout(()=>{if(!root.isConnected)return removeEventListener('resize',this.rs);this.build(true)},220)};
    addEventListener('resize',this.rs);
  }
  colsFor(){const w=this.root.clientWidth||innerWidth;return clamp(Math.round(w/(innerWidth<700?172:210)),2,7)}
  build(re){
    const n=this.colsFor();if(re&&n===this.n)return;this.n=n;
    this.root.innerHTML=Array.from({length:n},()=>'<div class="col"></div>').join('');
    this.cols=$$('.col',this.root);this.hs=Array(n).fill(0);this.place(this.list,false);lazy();
  }
  place(es,anim){
    es.forEach(e=>{
      let k=0;for(let i=1;i<this.n;i++)if(this.hs[i]<this.hs[k])k=i;
      this.cols[k].insertAdjacentHTML('beforeend',tile(e.it,e));
      const el=this.cols[k].lastElementChild;if(!anim)el.style.animation='none';
      this.hs[k]+=e.kind==='bd'?.5625:1.5;
      if(e.kind==='bd')this.io.observe(el);
    });
  }
  push(items,o={}){
    const base=this.list.length,es=items.map((it,i)=>({it,kind:it.bd&&(base+i)%6===4?'bd':'po',date:o.date,d:Math.min(i,10)}));
    this.list.push(...es);this.place(es,true);lazy();
  }
  clear(){this.list=[];this.build()}
}
function ink(tabs){
  let k=tabs.querySelector('.ink');if(!k){k=document.createElement('i');k.className='ink';tabs.appendChild(k)}
  const b=tabs.querySelector('button.on:not(.sm)');
  if(!b){k.style.setProperty('--w','0px');return}
  k.style.setProperty('--x',b.offsetLeft+'px');k.style.setProperty('--w',b.offsetWidth+'px');
  b.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
}
function infinite(sent,load){
  let busy=false,done=false;
  sent.className='sentinel load';
  const io=new IntersectionObserver(async es=>{
    if(!es[0].isIntersecting||busy||done)return;busy=true;
    try{done=(await load())===false}catch{done=true}
    busy=false;lazy();
    if(done){sent.className='sentinel';sent.textContent=''}else{io.unobserve(sent);io.observe(sent)}
  },{rootMargin:'1000px'});
  io.observe(sent);return()=>io.disconnect();
}

