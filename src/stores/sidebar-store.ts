import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isPinned: boolean;
  togglePin: () => void;
  setPin: (pinned: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isPinned: false,
      togglePin: () => set((state) => ({ isPinned: !state.isPinned })),
      setPin: (pinned) => set({ isPinned: pinned }),
    }),
    { name: "classflow-sidebar" },
  ),
);
