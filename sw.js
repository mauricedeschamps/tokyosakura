const CACHE_NAME = 'tokyo-cherry-v1';
const urlsToCache = [
  'index.html',
  'manifest.json'
];

// インストールイベント
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Caching failed', error);
      })
  );
});

// アクティベートイベント
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Service Worker: Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// フェッチイベント - オフライン対応
self.addEventListener('fetch', event => {
  // 画像リクエストの処理
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        
        // なければネットワークから取得してキャッシュに保存
        return fetch(event.request)
          .then(networkResponse => {
            // 有効なレスポンスのみキャッシュ
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
              return networkResponse;
            }
            
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            
            return networkResponse;
          })
          .catch(() => {
            // 画像取得失敗時のフォールバック
            return new Response(
              '<div class="image-error">🌸 Image offline</div>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
      })
    );
    return;
  }

  // HTMLとマニフェストの処理
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            // 有効なレスポンスのみキャッシュ
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
              return networkResponse;
            }
            
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('Service Worker: Fetch failed', error);
            
            // オフラインでHTMLリクエストの場合はメインページを返す
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('index.html');
            }
            
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// プッシュ通知（将来の拡張用）
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23ff8a9f"/%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%23ff8a9f"/%3E%3C/svg%3E',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification('Tokyo Cherry Blossom Guide', options)
  );
});