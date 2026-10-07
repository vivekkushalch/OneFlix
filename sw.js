/* Lumen service worker
   Shell: network-first (deploys show up on next open), cached fallback so the app opens offline.
   TMDB images: cache-first. TMDB API: network-first with cached fallback (browse what you've already seen offline).
   YouTube + Trakt: always network. */
const V='lumen-v3',IMGS='lumen-img-v1',API='lumen-api-v1';
const SHELF=['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'css/base.css', 'css/nav.css', 'css/layout.css', 'css/home.css', 'css/wall.css', 'css/detail.css', 'css/reel.css', 'css/overlays.css', 'js/icons.js', 'js/core/utils.js', 'js/core/data.js', 'js/core/trakt.js', 'js/core/actions.js', 'js/core/youtube.js', 'js/ui/sheet.js', 'js/ui/components.js', 'js/engine.js', 'js/pages/home.js', 'js/pages/discover.js', 'js/pages/search.js', 'js/pages/library.js', 'js/pages/detail.js', 'js/ui/trailer.js', 'js/router.js', 'js/main.js'];
const LIMIT={[IMGS]:500,[API]:320};
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELF)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>![V,IMGS,API].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function trim(name){const c=await caches.open(name),ks=await c.keys();if(ks.length>LIMIT[name])await Promise.all(ks.slice(0,ks.length-LIMIT[name]).map(k=>c.delete(k)))}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname==='image.tmdb.org'){
    e.respondWith(caches.open(IMGS).then(async c=>{const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==='opaque'){c.put(r,res.clone());trim(IMGS)}return res}).catch(()=>fetch(r)));
    return;
  }
  if(u.hostname==='api.themoviedb.org'){
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(API).then(c=>c.put(r,cp)).then(()=>trim(API))}return res}).catch(()=>caches.open(API).then(c=>c.match(r)).then(m=>m||new Response('{"results":[]}',{status:200,headers:{'Content-Type':'application/json'}}))));
    return;
  }
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
});
