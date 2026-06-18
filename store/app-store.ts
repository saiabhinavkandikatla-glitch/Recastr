import { create } from "zustand";

interface AppStore {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (value) => set({ sidebarOpen: value }),
}));
