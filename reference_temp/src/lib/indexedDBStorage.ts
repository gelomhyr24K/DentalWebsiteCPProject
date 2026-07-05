/**
 * Enterprise-grade IndexedDB and In-Memory Sync Storage Engine
 * Prevents localStorage QuotaExceededError by storing large datasets in IndexedDB,
 * while maintaining a synchronous in-memory cache for ultra-fast, 0ms latency access
 * compatible with standard React state initializations.
 */

const DB_NAME = 'DentalClinicProductionDB';
const DB_VERSION = 1;
const STORE_NAME = 'clinic_key_value_store';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private cache = new Map<string, any>();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor() {
    this.loadPromise = this.initDB().then(() => this.preloadAll());
  }

  /**
   * Initialize the IndexedDB database
   */
  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB initialization failed, falling back to in-memory only', event.target.error);
        resolve(); // Resolve anyway to allow in-memory fallback
      };
    });
  }

  /**
   * Preload all records from IndexedDB into memory
   */
  private preloadAll(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.db) {
        // Fall back to localStorage data if DB failed to open
        this.preloadFromLocalStorage();
        this.isLoaded = true;
        resolve();
        return;
      }

      try {
        const transaction = this.db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onsuccess = (event: any) => {
          const cursor = event.target.result;
          if (cursor) {
            this.cache.set(cursor.key, cursor.value);
            cursor.continue();
          } else {
            // Also import any existing localStorage data if cache is empty
            if (this.cache.size === 0) {
              this.preloadFromLocalStorage();
              this.syncInMemoryToDB();
            }
            this.isLoaded = true;
            resolve();
          }
        };

        request.onerror = () => {
          this.preloadFromLocalStorage();
          this.isLoaded = true;
          resolve();
        };
      } catch (e) {
        console.error('Preloading failed', e);
        this.preloadFromLocalStorage();
        this.isLoaded = true;
        resolve();
      }
    });
  }

  private preloadFromLocalStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            // If it's valid JSON, store parsed; otherwise raw
            if (
              (val.startsWith('{') && val.endsWith('}')) ||
              (val.startsWith('[') && val.endsWith(']'))
            ) {
              this.cache.set(key, JSON.parse(val));
            } else {
              this.cache.set(key, val);
            }
          }
        } catch (e) {
          this.cache.set(key, localStorage.getItem(key));
        }
      }
    }
  }

  private async syncInMemoryToDB() {
    if (!this.db) return;
    try {
      const transaction = this.db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const [key, value] of this.cache.entries()) {
        store.put(value, key);
      }
    } catch (e) {
      console.error('Syncing to IndexedDB failed', e);
    }
  }

  /**
   * Block until the DB has been initialized and preloaded
   */
  public async ensureReady(): Promise<void> {
    if (this.isLoaded) return;
    await this.loadPromise;
  }

  public getReadyState(): boolean {
    return this.isLoaded;
  }

  /**
   * Synchronously retrieve a value from the cache
   */
  public getItem(key: string): any {
    const val = this.cache.get(key);
    if (val === undefined) return null;
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }

  /**
   * Synchronously retrieve parsed object/array from the cache
   */
  public getObject<T>(key: string): T | null {
    const val = this.cache.get(key);
    if (val === undefined) return null;
    return val as T;
  }

  /**
   * Set a value in memory cache and trigger background write to IndexedDB
   */
  public setItem(key: string, value: any): void {
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        if (
          (value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))
        ) {
          parsedValue = JSON.parse(value);
        }
      } catch (e) {}
    }

    this.cache.set(key, parsedValue);

    // Sync to IndexedDB asynchronously
    if (this.db) {
      try {
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(parsedValue, key);
      } catch (e) {
        console.error(`Failed to write key "${key}" to IndexedDB`, e);
      }
    }

    // Fall back to localStorage for critical non-data small values
    const isSmallValueKey = 
      key === 'DENTAL_CURRENT_USER' || 
      key === 'DENTAL_CLINICS' || 
      key === 'DENTAL_USERS' || 
      key.startsWith('scratchpad_note_');
      
    if (isSmallValueKey || this.cache.size < 50) {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (e) {}
    }
  }

  /**
   * Remove a value from memory cache and IndexedDB
   */
  public removeItem(key: string): void {
    this.cache.delete(key);
    
    try {
      localStorage.removeItem(key);
    } catch (e) {}

    if (this.db) {
      try {
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(key);
      } catch (e) {
        console.error(`Failed to delete key "${key}" from IndexedDB`, e);
      }
    }
  }

  /**
   * Clear all stored data
   */
  public clear(): void {
    this.cache.clear();
    localStorage.clear();

    if (this.db) {
      try {
        const transaction = this.db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();
      } catch (e) {
        console.error('Failed to clear IndexedDB', e);
      }
    }
  }

  /**
   * Returns keys matching a prefix
   */
  public getKeysWithPrefix(prefix: string): string[] {
    const results: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        results.push(key);
      }
    }
    return results;
  }
}

export const clinicStorage = new IndexedDBStorage();
