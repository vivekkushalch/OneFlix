'use strict';
/* =====================================================================
   LUMEN — TMDB (catalogue, art, logos, trailers) + Trakt (sync & recs)
   Keys live in localStorage (avatar ▸ Settings). Serve over http for
   trailers: run serve.bat, or any static server.
   ===================================================================== */

/* ---------- utils ---------- */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},
  del(k){try{localStorage.removeItem(k)}catch{}}
};
const iso=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
const fmtRun=m=>m?(m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+'m'):'';
const fmtDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
const money=n=>n?'$'+(n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?Math.round(n/1e6)+'M':n.toLocaleString()):'';
const isWeb=/^https?:/.test(location.protocol);

