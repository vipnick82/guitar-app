/* Service worker - прави приложението достъпно офлайн.
   Кешира самата страница и всички mp3 мостри на китарата, така че
   след първото отваряне работи и без интернет (в самолет, в мазето, навсякъде). */

const VERSION = 'guitar-practice-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];
const SAMPLE_HOSTS = ['nbrosowsky.github.io', 'raw.githubusercontent.com'];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(VERSION)
      // addAll се проваля целият, ако един файл липсва - затова добавяме поединично
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(()=>{}))))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isSample = SAMPLE_HOSTS.includes(url.hostname);
  if(!sameOrigin && !isSample) return;

  // мострите не се променят никога → cache-first, само веднъж по мрежата
  if(isSample){
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res=>{
        if(res && res.ok){ const copy = res.clone(); caches.open(VERSION).then(c=>c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // страницата → network-first, за да виждаш обновленията; кешът е резервата
  e.respondWith(
    fetch(req).then(res=>{
      if(res && res.ok){ const copy = res.clone(); caches.open(VERSION).then(c=>c.put(req, copy)); }
      return res;
    }).catch(()=> caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
