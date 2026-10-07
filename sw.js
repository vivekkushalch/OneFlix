/* Lumen service worker — app shell works offline, posters cache as you browse.
   Shell: network-first (a deploy shows up on the next open), cache fallback offline.
   TMDB images: cache-first. API calls and YouTube: always network. */
const V='lumen-v1',SHELL=['./','index.html','app.css','icons.js','core.js','sheet.js','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
const IMGS='lumen-img-v1',MAX_IMGS=400;
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==IMGS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function trim(cache){const ks=await cache.keys();if(ks.length>MAX_IMGS)await Promise.all(ks.slice(0,ks.length-MAX_IMGS).map(k=>cache.delete(k)))}
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname==='image.tmdb.org'){
    e.respondWith(caches.open(IMGS).then(async c=>{const hit=await c.match(r);if(hit)return hit;const res=await fetch(r);if(res.ok||res.type==='opaque'){c.put(r,res.clone());trim(c)}return res}).catch(()=>fetch(r)));
    return;
  }
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))));
});
