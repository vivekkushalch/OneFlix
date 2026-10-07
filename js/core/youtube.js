'use strict';
/* ---------- YouTube (low level) ---------- */
let ytLoad;
function loadYT(){
  return ytLoad||(ytLoad=new Promise(res=>{
    if(window.YT&&YT.Player)return res(true);
    const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>res(false);
    window.onYouTubeIframeAPIReady=()=>res(true);document.head.appendChild(s);
    setTimeout(()=>res(!!(window.YT&&YT.Player)),9000);
  }));
}
async function ytMount(host,ids,o={}){
  if(!await loadYT()){o.fail&&o.fail('api');return null}
  ids=ids.slice(0,o.max||4);                       // studios often block embeds (error 150) — try a few, then hand over
  const mount=document.createElement('div');host.appendChild(mount);
  let i=0,started=false,timer;
  const vars={autoplay:1,mute:o.mute?1:0,controls:o.controls?1:0,rel:0,modestbranding:1,playsinline:1,iv_load_policy:3,fs:o.controls?1:0,disablekb:o.controls?0:1,enablejsapi:1};
  if(isWeb)vars.origin=location.origin;
  const p=new YT.Player(mount,{videoId:ids[0],host:'https://www.youtube-nocookie.com',playerVars:vars,events:{
    onReady:e=>{if(o.mute)e.target.mute();e.target.playVideo();if(o.timeout)timer=setTimeout(()=>{if(!started)o.fail&&o.fail('timeout')},o.timeout)},
    onStateChange:e=>{
      if(e.data===1&&!started){started=true;clearTimeout(timer);o.playing&&o.playing(p)}
      if(e.data===0&&o.loop){p.seekTo(0);p.playVideo()}
    },
    onError:()=>{clearTimeout(timer);if(ids[i+1]){i++;p.loadVideoById(ids[i])}else o.fail&&o.fail('error',ids[i])}
  }});
  return p;
}
function ytIds(vs=[]){
  const yt=vs.filter(v=>v.site==='YouTube');
  const rank=v=>(v.type==='Trailer'?0:v.type==='Teaser'?2:4)+(v.official?0:1);
  return yt.sort((a,b)=>rank(a)-rank(b)).map(v=>v.key);
}
