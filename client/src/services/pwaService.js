// PWA Service for managing offline functionality and app installation
class PWAService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.offlineQueue = [];
    this.syncInProgress = false;
    
    this.init();
  }

  init() {
    this.registerServiceWorker();
    this.setupEventListeners();
    this.checkInstallationStatus();
    this.setupBackgroundSync();
  }

  // Register Service Worker
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              // this.showUpdateNotification(); // Disabled - auto-updates silently in background
              console.log('New version detected, will activate on next load');
            }
          });
        });
        
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOffline();
    });

    // App installation
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideInstallPrompt();
      console.log('PWA was installed');
    });

    // Visibility change (app focus/blur)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.syncOfflineData();
      }
    });
  }

  // Check if app is installed
  checkInstallationStatus() {
    // Check if running as standalone app
    this.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                      window.navigator.standalone ||
                      document.referrer.includes('android-app://');
  }

  // Setup background sync
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      // Background sync is supported
      console.log('Background sync is supported');
    }
  }

  // Handle online status
  handleOnline() {
    console.log('App is online');
    this.syncOfflineData();
    this.showOnlineNotification();
  }

  // Handle offline status
  handleOffline() {
    console.log('App is offline');
    this.showOfflineNotification();
  }

  // Sync offline data when back online
  async syncOfflineData() {
    if (this.syncInProgress || this.offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log('Syncing offline data...');

    try {
      // Process offline queue
      const queue = [...this.offlineQueue];
      this.offlineQueue = [];

      for (const item of queue) {
        try {
          await this.processOfflineItem(item);
        } catch (error) {
          console.error('Failed to sync offline item:', error);
          // Re-add to queue if sync failed
          this.offlineQueue.push(item);
        }
      }

      console.log('Offline data sync completed');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process individual offline item
  async processOfflineItem(item) {
    const { url, method, headers, body, timestamp } = item;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (response.ok) {
        console.log('Successfully synced offline item:', url);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to sync offline item:', error);
      throw error;
    }
  }

  // Add item to offline queue
  addToOfflineQueue(url, method, headers, body) {
    const item = {
      id: Date.now() + Math.random(),
      url,
      method,
      headers,
      body,
      timestamp: new Date().toISOString()
    };

    this.offlineQueue.push(item);
    this.storeOfflineQueue();
    
    console.log('Added to offline queue:', item);
  }

  // Store offline queue in localStorage
  storeOfflineQueue() {
    try {
      localStorage.setItem('pwa_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to store offline queue:', error);
    }
  }

  // Load offline queue from localStorage
  loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('pwa_offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  // Show install prompt
  showInstallPrompt() {
    // Create install button or notification
    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.className = 'pwa-install-button';
    installButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    `;

    installButton.addEventListener('click', () => {
      this.installApp();
    });

    document.body.appendChild(installButton);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (installButton.parentNode) {
        installButton.remove();
      }
    }, 10000);
  }

  // Hide install prompt
  hideInstallPrompt() {
    const installButton = document.querySelector('.pwa-install-button');
    if (installButton) {
      installButton.remove();
    }
  }

  // Install app
  async installApp() {
    if (!this.deferredPrompt) {
      return;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    } catch (error) {
      console.error('Error installing app:', error);
    }
  }

  // Show update notification
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        z-index: 1000;
        max-width: 300px;
        animation: slideDown 0.3s ease-out;
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">Update Available</div>
        <div style="font-size: 14px; margin-bottom: 12px;">A new version is ready to install.</div>
        <button onclick="window.location.reload()" style="
          background: white;
          color: #28a745;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 8px;
        ">Update Now</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        ">Later</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 15000);
  }

  // Show online notification
  showOnlineNotification() {
    this.showNotification('You\'re back online!', 'Data is syncing...', 'success');
  }

  // Show offline notification
  showOfflineNotification() {
    this.showNotification('You\'re offline', 'Some features may be limited', 'warning');
  }

  // Show generic notification
  showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      max-width: 300px;
      animation: slideDown 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 14px;">${message}</div>
    `;

    document.body.appendChild(notification);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  // Check if app can be installed
  canInstall() {
    return this.deferredPrompt !== null;
  }

  // Check if app is installed
  isAppInstalled() {
    return this.isInstalled;
  }

  // Get offline queue length
  getOfflineQueueLength() {
    return this.offlineQueue.length;
  }

  // Clear offline queue
  clearOfflineQueue() {
    this.offlineQueue = [];
    this.storeOfflineQueue();
  }

  // Request background sync
  async requestBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        console.log('Background sync requested:', tag);
      } catch (error) {
        console.error('Background sync request failed:', error);
      }
    }
  }

  // Get app info
  getAppInfo() {
    return {
      isOnline: this.isOnline,
      isInstalled: this.isInstalled,
      canInstall: this.canInstall(),
      offlineQueueLength: this.getOfflineQueueLength(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }
}

// Create singleton instance
const pwaService = new PWAService();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .pwa-install-button:hover {
    background: #0056b3 !important;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(style);

export default pwaService;
