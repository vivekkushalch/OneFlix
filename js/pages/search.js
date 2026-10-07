'use strict';
/* =====================================================================
   SEARCH + LISTS — curated, ranked, club-style lists grouped by theme
   ===================================================================== */
const cc=(id,n,g,t,o={})=>({id,n,g,t,...o});
const lang=(id,n,code,x={})=>cc(id,n,'World cinema','movie',{p:{with_original_language:code,'vote_count.gte':300,...x}});
const decade=(id,n,a,b,vc)=>cc(id,n,'Decades','movie',{vc,p:{'primary_release_date.gte':a+'-01-01','primary_release_date.lte':b+'-12-31'}});
const COLLS=[
  /* themes */
  cc('noir','Neo-noir after dark','Themes','movie',{kw:'neo-noir',vc:300}),
  cc('heist','Heist nights','Themes','movie',{kw:'heist',vc:500}),
  cc('time','Time bends','Themes','movie',{kw:'time travel',vc:800}),
  cc('slow','Slow burns','Themes','movie',{p:{with_genres:'53|9648|18','with_runtime.gte':115,'vote_average.gte':7.6,'vote_count.gte':2500}}),
  cc('true','Based on real events','Themes','movie',{kw:'based on true story',vc:1500}),
  cc('road','Road movies','Themes','movie',{kw:'road trip',vc:600}),
  cc('dys','Dystopian futures','Themes','movie',{kw:'dystopia',vc:700}),
  cc('space','Out there','Themes','movie',{kw:'space',vc:1000}),
  cc('feel','Big feelings','Themes','movie',{p:{with_genres:'18|10749','vote_average.gte':7.8,'vote_count.gte':3000}}),
  cc('mind','Mind-benders','Themes','movie',{p:{with_genres:'878|9648','vote_average.gte':7.6,'vote_count.gte':4000}}),
  cc('cult','Cult classics','Themes','movie',{kw:'cult film',vc:300}),
  cc('coming','Coming of age','Themes','movie',{kw:'coming of age',vc:500}),
  cc('good','Feel-good','Themes','movie',{kw:'feel good',vc:400}),
  cc('court','Courtroom','Themes','movie',{kw:'courtroom',vc:300}),
  cc('bio','Biopics','Themes','movie',{kw:'biography',vc:600}),
  cc('book','Based on a book','Themes','movie',{kw:'based on novel or book',vc:1500}),
  cc('stand','Stand-up','Themes','movie',{kw:'stand-up comedy',vc:100}),
  cc('wdir','Women directors','Themes','movie',{kw:'woman director',vc:400}),
  cc('sport','Sports','Themes','movie',{kw:'sports',vc:500}),
  cc('war','War films','Themes','movie',{p:{with_genres:10752,'vote_average.gte':7.4,'vote_count.gte':1000}}),
  cc('west','Westerns','Themes','movie',{p:{with_genres:37,'vote_average.gte':7.2,'vote_count.gte':500}}),
  cc('horror','Horror worth it','Themes','movie',{p:{with_genres:27,'vote_average.gte':7,'vote_count.gte':1000}}),
  cc('romcom','Rom-coms','Themes','movie',{p:{with_genres:'35,10749','vote_average.gte':6.9,'vote_count.gte':800}}),
  cc('music','Musicals','Themes','movie',{p:{with_genres:10402,'vote_average.gte':7,'vote_count.gte':500}}),
  cc('docs','Documentaries','Themes','movie',{p:{with_genres:99,'vote_average.gte':7.4,'vote_count.gte':200}}),
  cc('anim','Animation for grown-ups','Themes','movie',{p:{with_genres:16,'vote_average.gte':7.8,'vote_count.gte':1500}}),
  /* series */
  cc('anime','Anime that stays with you','Series','tv',{p:{with_genres:16,with_original_language:'ja','vote_count.gte':300}}),
  cc('cozy','Comfort shows','Series','tv',{p:{with_genres:'35|10751','vote_average.gte':7.6,'vote_count.gte':400}}),
  cc('crimetv','Crime & prestige','Series','tv',{p:{with_genres:80,'vote_average.gte':8,'vote_count.gte':800}}),
  cc('scifitv','Sci-fi series','Series','tv',{p:{with_genres:10765,'vote_average.gte':7.8,'vote_count.gte':600}}),
  /* decades */
  decade('d60','The 60s',1960,1969,400),decade('d70','The 70s',1970,1979,500),decade('d80','The 80s',1980,1989,800),
  decade('d90','The 90s',1990,1999,1200),decade('d00','The 2000s',2000,2009,1500),decade('d10','The 2010s',2010,2019,2000),decade('d20','The 2020s',2020,2029,800),
  /* world cinema */
  lang('hi','Hindi cinema','hi'),lang('ta','Tamil cinema','ta',{'vote_count.gte':120}),lang('te','Telugu cinema','te',{'vote_count.gte':120}),lang('ml','Malayalam cinema','ml',{'vote_count.gte':80}),
  lang('ko','Korean cinema','ko'),lang('ja','Japanese cinema','ja',{without_genres:16}),lang('fr','French cinema','fr'),lang('es','Spanish-language','es'),
  lang('it','Italian cinema','it'),lang('de','German cinema','de'),lang('zh','Chinese-language','zh'),lang('sv','Scandinavian','sv',{'vote_count.gte':150}),lang('tr','Turkish cinema','tr',{'vote_count.gte':150}),lang('fa','Iranian cinema','fa',{'vote_count.gte':100})
];
const COLL_GROUPS=['Themes','Series','Decades','World cinema'];
async function collQuery(c,page=1){
  const p={sort_by:'vote_average.desc',page,'vote_count.gte':c.vc||300,...(c.p||{})};
  if(c.kw){const id=await kwId(c.kw);if(id)p.with_keywords=id}
  return tmdb('/discover/'+c.t,p);
}
let killBrowse=()=>{};
function renderExplore(q0,cid){
  killBrowse();
  const root=$('#v-explore'),coll=COLLS.find(c=>c.id===cid);
  if(coll){
    root.innerHTML=`<a class="back" href="#/explore">${ic('back')}</a><h1 class="ctitle">${esc(coll.n)}</h1><div id="exw"></div><div class="sentinel" id="exs"></div>`;
    const wall=new Wall($('#exw'));let page=0,count=0;
    killBrowse=infinite($('#exs'),async()=>{page++;const r=await collQuery(coll,page);const l=lst(r,coll.t);wall.push(l,{rank:count});count+=l.length;return page<Math.min(r.total_pages,20)});
    return;
  }
  root.innerHTML=`<label class="sbox">${ic('search')}<input id="exq" type="search" placeholder="Search" autocomplete="off" enterkeyhint="search" value="${esc(q0||'')}"></label><div id="exBody"></div>`;
  const body=$('#exBody'),inp=$('#exq');
  const paint=q=>{
    killBrowse();
    if(!q){
      body.innerHTML=COLL_GROUPS.map(g=>`<h2 class="sechead">${g}</h2><div class="covers">${COLLS.filter(c=>c.g===g).map((c,i)=>coverHTML(c,i%8,'sv')).join('')}</div>`).join('');
      fillCovers(COLLS,'sv');
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
