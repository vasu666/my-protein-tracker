const VERSION='v40';
const CACHE=`pt-${VERSION}`;
const APP_SHELL=['./','./index.html','./manifest.json','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of APP_SHELL){
      try{
        const req=new Request(url+(url.includes('?')?'&':'?')+'v='+VERSION,{cache:'no-store'});
        const res=await fetch(req);
        if(res.ok) await cache.put(url,res.clone());
      }catch(e){}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  if(req.mode==='navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(new Request(req,{cache:'no-store'}));
        if(fresh.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',fresh.clone());
          return fresh;
        }
      }catch(e){}
      return (await caches.match('./index.html')) || caches.match('./');
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached) return cached;
    try{
      const fresh=await fetch(req);
      if(fresh.ok){
        const cache=await caches.open(CACHE);
        await cache.put(req,fresh.clone());
      }
      return fresh;
    }catch(e){
      return new Response('',{status:504,statusText:'Offline'});
    }
  })());
});
