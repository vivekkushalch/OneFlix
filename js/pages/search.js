'use strict';
/* =====================================================================
   SEARCH + COLLECTIONS
   ===================================================================== */
const COLLS=[
  {id:'noir',n:'Neo-noir after dark',t:'movie',kw:'neo-noir',vc:300},
  {id:'heist',n:'Heist nights',t:'movie',kw:'heist',vc:500},
  {id:'time',n:'Time bends',t:'movie',kw:'time travel',vc:800},
  {id:'slow',n:'Slow burns',t:'movie',p:{with_genres:'53|9648|18','with_runtime.gte':115,'vote_average.gte':7.6,'vote_count.gte':2500}},
  {id:'true',n:'Based on real events',t:'movie',kw:'based on true story',vc:1500},
  {id:'road',n:'Road movies',t:'movie',kw:'road trip',vc:600},
  {id:'dys',n:'Dystopian futures',t:'movie',kw:'dystopia',vc:700},
  {id:'space',n:'Out there',t:'movie',kw:'space',vc:1000},
  {id:'anime',n:'Anime that stays with you',t:'tv',p:{with_genres:16,with_original_language:'ja','vote_count.gte':300}},
  {id:'cozy',n:'Comfort shows',t:'tv',p:{with_genres:'35|10751','vote_average.gte':7.6,'vote_count.gte':400}},
  {id:'feel',n:'Big feelings',t:'movie',p:{with_genres:'18|10749','vote_average.gte':7.8,'vote_count.gte':3000}},
  {id:'mind',n:'Mind-benders',t:'movie',p:{with_genres:'878|9648','vote_average.gte':7.6,'vote_count.gte':4000}}
];
async function collQuery(c,page=1){
  const p={sort_by:'vote_average.desc',page,'vote_count.gte':c.vc||300,...(c.p||{})};
  if(c.kw){const k=await tmdb('/search/keyword',{query:c.kw}).then(r=>r.results&&r.results[0]).catch(()=>null);if(k)p.with_keywords=k.id}
  return tmdb('/discover/'+c.t,p);
}
let killBrowse=()=>{};
function renderExplore(q0,cid){
  killBrowse();
  const root=$('#v-explore'),coll=COLLS.find(c=>c.id===cid);
  if(coll){
    root.innerHTML=`<a class="back" href="#/explore">${ic('back')}</a><h1 class="ctitle">${esc(coll.n)}</h1><div id="exw"></div><div class="sentinel" id="exs"></div>`;
    const wall=new Wall($('#exw'));let page=0;
    killBrowse=infinite($('#exs'),async()=>{page++;const r=await collQuery(coll,page);wall.push(lst(r,coll.t));return page<Math.min(r.total_pages,20)});
    return;
  }
  root.innerHTML=`<label class="sbox">${ic('search')}<input id="exq" type="search" placeholder="Search" autocomplete="off" enterkeyhint="search" value="${esc(q0||'')}"></label><div id="exBody"></div>`;
  const body=$('#exBody'),inp=$('#exq');
  const paint=q=>{
    killBrowse();
    if(!q){
      body.innerHTML=`<div class="covers">${COLLS.map((c,i)=>`<a class="cover" href="#/explore?c=${c.id}" style="--d:${i}"><img alt="" draggable="false" id="cv-${c.id}"><b>${esc(c.n)}</b></a>`).join('')}</div>`;
      COLLS.forEach(async c=>{try{const r=await collQuery(c),x=(r.results||[]).find(z=>z.backdrop_path),el=$('#cv-'+c.id);if(x&&el){el.src=img(x.backdrop_path,'w780');el.onload=()=>el.classList.add('ld')}}catch{}});
      return;
    }
    body.innerHTML=`<div id="exw"></div><div class="sentinel" id="exs"></div>`;
    const wall=new Wall($('#exw'));let page=0;
    killBrowse=infinite($('#exs'),async()=>{page++;const r=await tmdb('/search/multi',{query:q,page,include_adult:false});const l=lst(r);
      if(!l.length&&page===1){$('#exw').innerHTML=`<div class="empty"><b>No results</b><p>Try another spelling.</p></div>`;return false}
      wall.push(l);return page<Math.min(r.total_pages,20)});
  };
  let t;inp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>paint(inp.value.trim()),360)});
  paint((q0||'').trim());
  if(!q0&&innerWidth>900)inp.focus({preventScroll:true});
}

