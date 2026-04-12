import { STORAGE_KEY } from '../constants.js';

export const storage = {
  async load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  async save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch (e) { console.error("Storage save failed:", e); }
  },
};
