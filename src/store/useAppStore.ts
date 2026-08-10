import { create } from 'zustand';
import { Specimen, PharmacItem } from '../types';
import { dataStore } from '../lib/dataStore';

interface AppState {
  specimens: Specimen[];
  pharmacopoeia: PharmacItem[];
  isInitialized: boolean;
  isLoading: boolean;
  cachedStats: any | null;
  
  loadData: () => Promise<void>;
  initializeData: (
    specimens: Specimen[], 
    pharmacopoeia: PharmacItem[], 
    onProgress?: (msg: string) => void
  ) => Promise<void>;
  clearData: () => Promise<void>;
  appendSpecimens: (specimens: Specimen[], onProgress?: (msg: string) => void) => Promise<void>;
  appendPharmacopoeia: (pharmacopoeia: PharmacItem[], onProgress?: (msg: string) => void) => Promise<void>;
  
  setSpecimens: (specimens: Specimen[]) => void;
  setPharmacopoeia: (pharmacopoeia: PharmacItem[]) => void;

  // Specimens CRUD wrappers
  addSpecimen: (data: Omit<Specimen, 'id'>) => Promise<Specimen>;
  updateSpecimen: (id: string, data: Partial<Specimen>) => Promise<Specimen>;
  deleteSpecimen: (id: string) => Promise<void>;

  // Pharmacopoeia CRUD wrappers
  addPharmacoItem: (data: Omit<PharmacItem, 'id'>) => Promise<PharmacItem>;
  updatePharmacoItem: (id: string, data: Partial<PharmacItem>) => Promise<PharmacItem>;
  deletePharmacoItem: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  specimens: [],
  pharmacopoeia: [],
  isInitialized: false,
  isLoading: true,
  cachedStats: null,

  loadData: async () => {
    set({ isLoading: true });
    try {
      const initialized = await dataStore.isInitialized();
      if (initialized) {
        const stats = await dataStore.getCachedStats();
        set({
          cachedStats: stats,
          isInitialized: true,
        });
      } else {
        set({
          cachedStats: null,
          isInitialized: false,
        });
      }
    } catch (e) {
      console.error('Failed to load data from store', e);
    } finally {
      set({ isLoading: false });
    }
  },

  initializeData: async (specimens, pharmacopoeia, onProgress) => {
    set({ isLoading: true });
    try {
      await dataStore.initialize(specimens, pharmacopoeia, onProgress);
      const stats = await dataStore.getCachedStats();
      set({
        specimens: [], // Do not cache all in memory
        pharmacopoeia: [],
        cachedStats: stats,
        isInitialized: true,
      });
    } catch (e) {
      console.error('Failed to initialize store data', e);
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  clearData: async () => {
    set({ isLoading: true });
    try {
      await dataStore.clearAll();
    } catch (e) {
      console.error('Failed to clear database, resetting local store state anyway', e);
    } finally {
      set({
        specimens: [],
        pharmacopoeia: [],
        cachedStats: null,
        isInitialized: false,
        isLoading: false,
      });
    }
  },

  appendSpecimens: async (specimens, onProgress) => {
    set({ isLoading: true });
    try {
      await dataStore.appendSpecimens(specimens, onProgress);
      const stats = await dataStore.getCachedStats();
      set({ cachedStats: stats });
    } catch (e) {
      console.error('Failed to append specimens:', e);
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  appendPharmacopoeia: async (pharmacopoeia, onProgress) => {
    set({ isLoading: true });
    try {
      await dataStore.appendPharmacopoeia(pharmacopoeia, onProgress);
      const stats = await dataStore.getCachedStats();
      set({ cachedStats: stats });
    } catch (e) {
      console.error('Failed to append pharmacopoeia:', e);
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  setSpecimens: (specimens) => set({ specimens }),
  setPharmacopoeia: (pharmacopoeia) => set({ pharmacopoeia }),

  addSpecimen: async (data) => {
    const newSpecimen = await dataStore.createSpecimen(data);
    
    // Incrementally update cachedStats
    const oldStats = get().cachedStats;
    if (oldStats) {
      const updatedStats = {
        ...oldStats,
        totalSpecimensCount: (oldStats.totalSpecimensCount || 0) + 1,
        familyMetrics: {
          ...oldStats.familyMetrics,
          total: (oldStats.familyMetrics?.total || 0) + 1
        }
      };
      await dataStore.saveCachedStats(updatedStats);
      set({ cachedStats: updatedStats });
    }

    return newSpecimen;
  },

  updateSpecimen: async (id, data) => {
    const updatedSpecimen = await dataStore.updateSpecimen(id, data);
    return updatedSpecimen;
  },

  deleteSpecimen: async (id) => {
    await dataStore.deleteSpecimen(id);

    // Incrementally update cachedStats
    const oldStats = get().cachedStats;
    if (oldStats) {
      const updatedStats = {
        ...oldStats,
        totalSpecimensCount: Math.max(0, (oldStats.totalSpecimensCount || 1) - 1),
        familyMetrics: {
          ...oldStats.familyMetrics,
          total: Math.max(0, (oldStats.familyMetrics?.total || 1) - 1)
        }
      };
      await dataStore.saveCachedStats(updatedStats);
      set({ cachedStats: updatedStats });
    }
  },

  addPharmacoItem: async (data) => {
    const newItem = await dataStore.createPharmacoItem(data);
    
    const oldStats = get().cachedStats;
    if (oldStats) {
      const updatedStats = {
        ...oldStats,
        totalPharmacopoeiaCount: (oldStats.totalPharmacopoeiaCount || 0) + 1
      };
      await dataStore.saveCachedStats(updatedStats);
      set({ cachedStats: updatedStats });
    }

    return newItem;
  },

  updatePharmacoItem: async (id, data) => {
    const updatedItem = await dataStore.updatePharmacoItem(id, data);
    return updatedItem;
  },

  deletePharmacoItem: async (id) => {
    await dataStore.deletePharmacoItem(id);

    const oldStats = get().cachedStats;
    if (oldStats) {
      const updatedStats = {
        ...oldStats,
        totalPharmacopoeiaCount: Math.max(0, (oldStats.totalPharmacopoeiaCount || 1) - 1)
      };
      await dataStore.saveCachedStats(updatedStats);
      set({ cachedStats: updatedStats });
    }
  },
}));
