import { create } from 'zustand';
import { Specimen, PharmacItem } from '../types';
import { dataStore } from '../lib/dataStore';
import { buildSpecimenToPharmacIndex } from '../lib/joinLogic';

interface AppState {
  specimens: Specimen[];
  pharmacopoeia: PharmacItem[];
  isInitialized: boolean;
  isLoading: boolean;
  specimenToPharmacMap: Map<string, PharmacItem>;
  
  loadData: () => Promise<void>;
  initializeData: (specimens: Specimen[], pharmacopoeia: PharmacItem[]) => Promise<void>;
  clearData: () => Promise<void>;

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
  specimenToPharmacMap: new Map(),

  loadData: async () => {
    // If specimens are already cached in memory, don't trigger loading state
    if (get().specimens.length > 0 && get().isInitialized) {
      return;
    }
    
    console.time('useAppStore:loadData');
    set({ isLoading: true });
    try {
      const initialized = await dataStore.isInitialized();
      if (initialized) {
        console.time('useAppStore:IndexedDB_Reads');
        const specimens = await dataStore.getSpecimens();
        const pharmacopoeia = await dataStore.getPharmacopoeia();
        console.timeEnd('useAppStore:IndexedDB_Reads');
        
        console.time('useAppStore:Build_Index');
        const map = buildSpecimenToPharmacIndex(pharmacopoeia);
        console.timeEnd('useAppStore:Build_Index');
        
        set({
          specimens,
          pharmacopoeia,
          isInitialized: true,
          specimenToPharmacMap: map,
        });
      } else {
        set({
          specimens: [],
          pharmacopoeia: [],
          isInitialized: false,
          specimenToPharmacMap: new Map(),
        });
      }
    } catch (e) {
      console.error('Failed to load data from store', e);
    } finally {
      set({ isLoading: false });
      console.timeEnd('useAppStore:loadData');
    }
  },

  initializeData: async (specimens: Specimen[], pharmacopoeia: PharmacItem[]) => {
    set({ isLoading: true });
    try {
      await dataStore.initialize(specimens, pharmacopoeia);
      const map = buildSpecimenToPharmacIndex(pharmacopoeia);
      set({
        specimens,
        pharmacopoeia,
        isInitialized: true,
        specimenToPharmacMap: map,
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
      set({
        specimens: [],
        pharmacopoeia: [],
        isInitialized: false,
        specimenToPharmacMap: new Map(),
      });
    } catch (e) {
      console.error('Failed to clear data', e);
    } finally {
      set({ isLoading: false });
    }
  },

  addSpecimen: async (data) => {
    const newSpecimen = await dataStore.createSpecimen(data);
    const updatedSpecimens = [...get().specimens, newSpecimen];
    set({ specimens: updatedSpecimens });
    return newSpecimen;
  },

  updateSpecimen: async (id, data) => {
    const updatedSpecimen = await dataStore.updateSpecimen(id, data);
    const updatedSpecimens = get().specimens.map((s) => (s.id === id ? updatedSpecimen : s));
    set({ specimens: updatedSpecimens });
    return updatedSpecimen;
  },

  deleteSpecimen: async (id) => {
    await dataStore.deleteSpecimen(id);
    const updatedSpecimens = get().specimens.filter((s) => s.id !== id);
    set({ specimens: updatedSpecimens });
  },

  addPharmacoItem: async (data) => {
    const newItem = await dataStore.createPharmacoItem(data);
    const updatedPharma = [...get().pharmacopoeia, newItem];
    const map = buildSpecimenToPharmacIndex(updatedPharma);
    set({ pharmacopoeia: updatedPharma, specimenToPharmacMap: map });
    return newItem;
  },

  updatePharmacoItem: async (id, data) => {
    const updatedItem = await dataStore.updatePharmacoItem(id, data);
    const updatedPharma = get().pharmacopoeia.map((p) => (p.id === id ? updatedItem : p));
    const map = buildSpecimenToPharmacIndex(updatedPharma);
    set({ pharmacopoeia: updatedPharma, specimenToPharmacMap: map });
    return updatedItem;
  },

  deletePharmacoItem: async (id) => {
    await dataStore.deletePharmacoItem(id);
    const updatedPharma = get().pharmacopoeia.filter((p) => p.id !== id);
    const map = buildSpecimenToPharmacIndex(updatedPharma);
    set({ pharmacopoeia: updatedPharma, specimenToPharmacMap: map });
  },
}));
