// Service Worker for Chess Tournament Management PWA
const CACHE_NAME = 'chess-tournament-v1.0.0';
const STATIC_CACHE = 'chess-tournament-static-v1.0.0';
const DYNAMIC_CACHE = 'chess-tournament-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API routes to cache for offline access
const API_CACHE_PATTERNS = [
  /\/api\/tournaments/,
  /\/api\/players/,
  /\/api\/standings/,
  /\/api\/pairings/
];

// API routes that should always go to network (no offline fallback)
const NETWORK_ONLY_PATTERNS = [
  /\/api\/lichess/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Lichess API calls - let them go directly to network
  if (NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return;
  }

  // Skip non-GET requests for other APIs
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

// Handle different types of requests
async function handleRequest(request) {
  const url = new URL(request.url);

  try {
    // Handle API requests with network-first strategy
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request);
    }

    // Handle static files with cache-first strategy
    if (isStaticFile(url.pathname)) {
      return await handleStaticRequest(request);
    }

    // Handle HTML pages with network-first strategy
    if (request.headers.get('accept').includes('text/html')) {
      return await handleHtmlRequest(request);
    }

    // Default: try network first, fallback to cache
    return await networkFirst(request);
  } catch (error) {
    console.error('Service Worker: Error handling request', error);
    return await getOfflineResponse(request);
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for API request');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API
    return getOfflineApiResponse(request);
  }
}

// Handle static files with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Error loading static file', error);
    return getOfflineResponse(request);
  }
}

// Handle HTML requests with network-first strategy
async function handleHtmlRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache HTML responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for HTML request');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return getOfflinePage();
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache');
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return getOfflineResponse(request);
  }
}

// Check if file is static
function isStaticFile(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Get offline response for different request types
async function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api/')) {
    return getOfflineApiResponse(request);
  }
  
  if (request.headers.get('accept').includes('text/html')) {
    return getOfflinePage();
  }
  
  return new Response('Offline content not available', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Get offline API response
function getOfflineApiResponse(request) {
  const url = new URL(request.url);
  
  // Return appropriate offline data based on API endpoint
  if (url.pathname.includes('/tournaments')) {
    return new Response(JSON.stringify({
      success: true,
      data: [],
      message: 'Offline mode - limited data available',
      offline: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (url.pathname.includes('/standings')) {
    return new Response(JSON.stringify({
      success: true,
      data: {
        tournamentId: 'offline',
        standings: [],
        offline: true,
        message: 'Offline mode - standings not available'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({
    success: false,
    error: 'Offline mode - API not available',
    offline: true
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Get offline page
async function getOfflinePage() {
  const cache = await caches.open(STATIC_CACHE);
  const offlinePage = await cache.match('/offline.html');
  
  if (offlinePage) {
    return offlinePage;
  }
  
  // Return a simple offline page
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Chess Tournament - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .offline-container {
          text-align: center;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
        }
        .offline-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
        }
        p {
          color: #666;
          margin-bottom: 20px;
        }
        .retry-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        .retry-btn:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>You're Offline</h1>
        <p>This app works offline, but some features may be limited. Check your internet connection and try again.</p>
        <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'tournament-sync') {
    event.waitUntil(syncTournamentData());
  }
  
  if (event.tag === 'player-sync') {
    event.waitUntil(syncPlayerData());
  }
});

// Sync tournament data when back online
async function syncTournamentData() {
  try {
    console.log('Service Worker: Syncing tournament data...');
    
    // Get pending tournament updates from IndexedDB
    const pendingUpdates = await getPendingUpdates('tournament-updates');
    
    for (const update of pendingUpdates) {
      try {
        await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: update.body
        });
        
        // Remove from pending updates
        await removePendingUpdate('tournament-updates', update.id);
        console.log('Service Worker: Synced tournament update', update.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync tournament update', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error syncing tournament data', error);
  }
}

// Sync player data when back online
async function syncPlayerData() {
  try {
    console.log('Service Worker: Syncing player data...');
    
    // Get pending player updates from IndexedDB
    const pendingUpdates = await getPendingUpdates('player-updates');
    
    for (const update of pendingUpdates) {
      try {
        await fetch(update.url, {
          method: update.method,
          headers: update.headers,
          body: update.body
        });
        
        // Remove from pending updates
        await removePendingUpdate('player-updates', update.id);
        console.log('Service Worker: Synced player update', update.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync player update', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error syncing player data', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: 'New tournament update available',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Tournament',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };
  
  if (event.data) {
    const data = event.data.json();
    options.body = data.body || options.body;
    options.data = { ...options.data, ...data };
  }
  
  event.waitUntil(
    self.registration.showNotification('Chess Tournament', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions for IndexedDB operations
async function getPendingUpdates(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChessTournamentDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function removePendingUpdate(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ChessTournamentDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

console.log('Service Worker: Loaded successfully');
