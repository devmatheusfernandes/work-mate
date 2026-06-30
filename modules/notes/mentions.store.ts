import { create } from "zustand";

interface MentionPreviewState {
  isOpen: boolean;
  selectedId: string | null;
  selectedType: string | null;
  setIsOpen: (isOpen: boolean) => void;
  openPreview: (id: string, type: string) => void;
  closePreview: () => void;
}

export const useMentionsStore = create<MentionPreviewState>((set) => ({
  isOpen: false,
  selectedId: null,
  selectedType: null,
  setIsOpen: (isOpen) => set({ isOpen }),
  openPreview: (id, type) => set({ isOpen: true, selectedId: id, selectedType: type }),
  closePreview: () => set({ isOpen: false, selectedId: null, selectedType: null }),
}));
