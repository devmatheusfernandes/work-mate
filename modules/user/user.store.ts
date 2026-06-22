import { create } from "zustand";

interface User {
    name: string | null;
    email: string | null;
    photoUrl?: string | null;
    role?: string;
}

interface UserState {
    user: User | null;
    hasHydrated: boolean;
    setUser: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    hasHydrated: true,
    setUser: (user) => set({ user }),
}));
