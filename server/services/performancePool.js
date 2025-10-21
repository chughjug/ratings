/**
 * Performance Pool for instant responses and connection reuse
 * Provides memory pools, connection pooling, and instant caching
 */

const { Worker } = require('worker_threads');
const axios = require('axios');

// Memory pool for instant object reuse
class MemoryPool {
  constructor(createFn, resetFn, maxSize = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.maxSize = maxSize;
  }

  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return this.createFn();
  }

  release(obj) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }
}

// Connection pool for HTTP requests
class ConnectionPool {
  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
    this.connections = [];
    this.busy = new Set();
  }

  async acquire() {
    // Return existing connection if available
    for (const conn of this.connections) {
      if (!this.busy.has(conn)) {
        this.busy.add(conn);
        return conn;
      }
    }

    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      const conn = axios.create({
        timeout: 2000,
        maxRedirects: 2,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Connection': 'keep-alive',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });
      
      this.connections.push(conn);
      this.busy.add(conn);
      return conn;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkForConnection = () => {
        for (const conn of this.connections) {
          if (!this.busy.has(conn)) {
            this.busy.add(conn);
            resolve(conn);
            return;
          }
        }
        setTimeout(checkForConnection, 10);
      };
      checkForConnection();
    });
  }

  release(conn) {
    this.busy.delete(conn);
  }
}

// Worker pool for parallel processing
class WorkerPool {
  constructor(workerScript, maxWorkers = 4) {
    this.workerScript = workerScript;
    this.maxWorkers = maxWorkers;
    this.workers = [];
    this.busy = new Set();
    this.queue = [];
    
    this.initializeWorkers();
  }

  initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(this.workerScript, { eval: true });
      this.workers.push(worker);
    }
  }

  async execute(data) {
    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject };
      
      // Try to find available worker
      for (let i = 0; i < this.workers.length; i++) {
        if (!this.busy.has(i)) {
          this.executeTask(i, task);
          return;
        }
      }
      
      // Queue task if no workers available
      this.queue.push(task);
    });
  }

  executeTask(workerIndex, task) {
    const worker = this.workers[workerIndex];
    this.busy.add(workerIndex);
    
    const messageHandler = (result) => {
      worker.off('message', messageHandler);
      this.busy.delete(workerIndex);
      
      if (result.error) {
        task.reject(new Error(result.error));
      } else {
        task.resolve(result);
      }
      
      // Process next queued task
      if (this.queue.length > 0) {
        const nextTask = this.queue.shift();
        this.executeTask(workerIndex, nextTask);
      }
    };
    
    worker.on('message', messageHandler);
    worker.postMessage(task.data);
  }
}

// Instant cache with TTL and LRU eviction
class InstantCache {
  constructor(maxSize = 10000, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map();
    this.accessOrder = new Map();
    this.accessCounter = 0;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check TTL
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }
    
    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    return item.data;
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [k, time] of this.accessOrder) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
    this.accessOrder.set(key, ++this.accessCounter);
  }

  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  size() {
    return this.cache.size;
  }
}

// Global performance pools
const connectionPool = new ConnectionPool(20);
const instantCache = new InstantCache(20000, 10 * 60 * 1000); // 10 minutes, 20k entries

// Memory pools for common objects
const playerObjectPool = new MemoryPool(
  () => ({}),
  (obj) => {
    Object.keys(obj).forEach(key => delete obj[key]);
  },
  1000
);

const searchResultPool = new MemoryPool(
  () => [],
  (arr) => {
    arr.length = 0;
  },
  500
);

// Precomputed search index for instant matching
const searchIndex = new Map();

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      searchTimes: [],
      importTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0
    };
  }

  recordSearch(duration) {
    this.metrics.searchTimes.push(duration);
    this.metrics.totalRequests++;
    
    // Keep only last 1000 measurements
    if (this.metrics.searchTimes.length > 1000) {
      this.metrics.searchTimes.shift();
    }
  }

  recordImport(duration) {
    this.metrics.importTimes.push(duration);
    
    // Keep only last 100 measurements
    if (this.metrics.importTimes.length > 100) {
      this.metrics.importTimes.shift();
    }
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  getStats() {
    const avgSearchTime = this.metrics.searchTimes.length > 0 
      ? this.metrics.searchTimes.reduce((a, b) => a + b, 0) / this.metrics.searchTimes.length 
      : 0;
    
    const avgImportTime = this.metrics.importTimes.length > 0 
      ? this.metrics.importTimes.reduce((a, b) => a + b, 0) / this.metrics.importTimes.length 
      : 0;
    
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;

    return {
      avgSearchTime: Math.round(avgSearchTime),
      avgImportTime: Math.round(avgImportTime),
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalRequests: this.metrics.totalRequests,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses
    };
  }
}

const performanceMonitor = new PerformanceMonitor();

// Preload common data for instant access
async function preloadCommonData() {
  console.log('Preloading common data for instant access...');
  
  const commonSearches = [
    'smith', 'johnson', 'williams', 'brown', 'jones', 'davis', 'miller', 'wilson', 'moore', 'taylor',
    'anderson', 'thomas', 'jackson', 'white', 'harris', 'martin', 'thompson', 'garcia', 'martinez', 'robinson'
  ];
  
  // Pre-populate instant cache with common patterns
  for (const pattern of commonSearches) {
    instantCache.set(pattern, []);
    searchIndex.set(pattern, []);
  }
  
  console.log(`Preloaded ${commonSearches.length} common search patterns`);
}

// Initialize performance pools on module load
preloadCommonData().catch(console.error);

module.exports = {
  MemoryPool,
  ConnectionPool,
  WorkerPool,
  InstantCache,
  PerformanceMonitor,
  connectionPool,
  instantCache,
  playerObjectPool,
  searchResultPool,
  searchIndex,
  performanceMonitor,
  preloadCommonData
};
