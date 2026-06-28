import { Specimen, PharmacItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface DataStore {
  getSpecimens(): Promise<Specimen[]>;
  getSpecimenById(id: string): Promise<Specimen | null>;
  createSpecimen(data: Omit<Specimen, 'id'>): Promise<Specimen>;
  updateSpecimen(id: string, data: Partial<Specimen>): Promise<Specimen>;
  deleteSpecimen(id: string): Promise<void>;

  getPharmacopoeia(): Promise<PharmacItem[]>;
  getPharmacoItemById(id: string): Promise<PharmacItem | null>;
  createPharmacoItem(data: Omit<PharmacItem, 'id'>): Promise<PharmacItem>;
  updatePharmacoItem(id: string, data: Partial<PharmacItem>): Promise<PharmacItem>;
  deletePharmacoItem(id: string): Promise<void>;

  clearAll(): Promise<void>;
  initialize(specimens: Specimen[], pharmacopoeia: PharmacItem[]): Promise<void>;
  isInitialized(): Promise<boolean>;
}

// Next.js hot-reload singleton connection manager
const globalForDb = globalThis as unknown as {
  dbPromise: Promise<IDBDatabase> | undefined;
};

export class KeyValueIndexedDBStore implements DataStore {
  private dbName = 'NIMS_Specimen_DB_v2';
  private version = 1;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available on server-side'));
    }

    if (globalForDb.dbPromise) {
      return globalForDb.dbPromise;
    }

    globalForDb.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
      };
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        globalForDb.dbPromise = undefined; // reset on error so we can retry
        reject(request.error);
      };
    });

    return globalForDb.dbPromise;
  }

  async getSpecimens(): Promise<Specimen[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction('kv', 'readonly');
      const store = transaction.objectStore('kv');
      return new Promise<Specimen[]>((resolve, reject) => {
        const request = store.get('specimens');
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Error reading specimens from IndexedDB', e);
      return [];
    }
  }

  async getSpecimenById(id: string): Promise<Specimen | null> {
    const list = await this.getSpecimens();
    return list.find((s) => s.id === id) || null;
  }

  async createSpecimen(data: Omit<Specimen, 'id'>): Promise<Specimen> {
    const list = await this.getSpecimens();
    const newItem: Specimen = { ...data, id: uuidv4() };
    list.push(newItem);
    
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.put(list, 'specimens');
    
    return new Promise<Specimen>((resolve, reject) => {
      transaction.oncomplete = () => resolve(newItem);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updateSpecimen(id: string, data: Partial<Specimen>): Promise<Specimen> {
    const list = await this.getSpecimens();
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Specimen with id ${id} not found.`);
    const updated = { ...list[idx], ...data };
    list[idx] = updated;
    
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.put(list, 'specimens');
    
    return new Promise<Specimen>((resolve, reject) => {
      transaction.oncomplete = () => resolve(updated);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteSpecimen(id: string): Promise<void> {
    const list = await this.getSpecimens();
    const filtered = list.filter((s) => s.id !== id);
    
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.put(filtered, 'specimens');
    
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getPharmacopoeia(): Promise<PharmacItem[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction('kv', 'readonly');
      const store = transaction.objectStore('kv');
      return new Promise<PharmacItem[]>((resolve, reject) => {
        const request = store.get('pharmacopoeia');
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('Error reading pharmacopoeia from IndexedDB', e);
      return [];
    }
  }

  async getPharmacoItemById(id: string): Promise<PharmacItem | null> {
    const list = await this.getPharmacopoeia();
    return list.find((p) => p.id === id) || null;
  }

  async createPharmacoItem(data: Omit<PharmacItem, 'id'>): Promise<PharmacItem> {
    const list = await this.getPharmacopoeia();
    const newItem: PharmacItem = { ...data, id: uuidv4() };
    list.push(newItem);
    
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.put(list, 'pharmacopoeia');
    
    return new Promise<PharmacItem>((resolve, reject) => {
      transaction.oncomplete = () => resolve(newItem);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async updatePharmacoItem(id: string, data: Partial<PharmacItem>): Promise<PharmacItem> {
    const list = await this.getPharmacopoeia();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`PharmacItem with id ${id} not found.`);
    const updated = { ...list[idx], ...data };
    list[idx] = updated;
    
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.put(list, 'pharmacopoeia');
    
    return new Promise<PharmacItem>((resolve, reject) => {
      transaction.oncomplete = () => resolve(updated);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deletePharmacoItem(id: string): Promise<void> {
    const list = await this.getPharmacopoeia();
    const filtered = list.filter((p) => p.id !== id);
    
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.put(filtered, 'pharmacopoeia');
    
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    store.clear();
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async initialize(specimens: Specimen[], pharmacopoeia: PharmacItem[]): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction('kv', 'readwrite');
    const store = transaction.objectStore('kv');
    
    store.put(specimens, 'specimens');
    store.put(pharmacopoeia, 'pharmacopoeia');
    store.put(true, 'initialized');
    
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async isInitialized(): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction('kv', 'readonly');
      const store = transaction.objectStore('kv');
      return new Promise<boolean>((resolve) => {
        const request = store.get('initialized');
        request.onsuccess = () => resolve(request.result === true);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }
}

export const dataStore: DataStore = new KeyValueIndexedDBStore();
