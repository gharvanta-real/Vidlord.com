const CACHE_NAME = 'vidlord-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Active streams registry for ReadableStream download interception
const activeStreams = new Map();
const activeControllers = new Map();
const pendingChunks = new Map();
const pendingDone = new Set();

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'REGISTER_DOWNLOAD') {
    const id = data.id;
    const port = event.ports[0];
    
    if (port) {
      activeStreams.set(id, port);
      
      port.onmessage = (msgEvent) => {
        const msg = msgEvent.data;
        const controller = activeControllers.get(id);
        
        if (msg.type === 'CHUNK') {
          if (controller) {
            controller.enqueue(msg.chunk);
          } else {
            if (!pendingChunks.has(id)) {
              pendingChunks.set(id, []);
            }
            pendingChunks.get(id).push(msg.chunk);
          }
        } else if (msg.type === 'DONE') {
          if (controller) {
            controller.close();
            activeControllers.delete(id);
            activeStreams.delete(id);
          } else {
            pendingDone.add(id);
          }
        } else if (msg.type === 'ERROR') {
          if (controller) {
            controller.error(new Error(msg.error || 'Stream error'));
            activeControllers.delete(id);
          }
          activeStreams.delete(id);
        }
      };
    }
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // 1. Intercept stream download requests
  if (url.pathname === '/sw-download') {
    const id = url.searchParams.get('id');
    const filename = url.searchParams.get('filename') || 'download.ts';
    
    const stream = new ReadableStream({
      start(controller) {
        activeControllers.set(id, controller);
        
        // Flush any pending chunks that arrived before fetch start
        const pending = pendingChunks.get(id);
        if (pending) {
          for (const chunk of pending) {
            controller.enqueue(chunk);
          }
          pendingChunks.delete(id);
        }
        
        // Check if stream completed before fetch start
        if (pendingDone.has(id)) {
          controller.close();
          pendingDone.delete(id);
          activeControllers.delete(id);
        }
      },
      cancel() {
        activeControllers.delete(id);
        const port = activeStreams.get(id);
        if (port) {
          port.postMessage({ type: 'CANCELLED' });
          activeStreams.delete(id);
        }
      }
    });
    
    const headers = new Headers({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    e.respondWith(new Response(stream, { headers }));
    return;
  }
  
  // Do not intercept API requests or SSE download streams
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/downloads')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
