import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import Cookies from "js-cookie";

export type ThemeColor = "violet" | "rose" | "indigo" | "yellow" | "green";
export type ThemeMode = "light" | "dark" | "system";

interface AppearanceState {
    themeColor: ThemeColor;
    mode: ThemeMode;
}

interface AppearanceActions {
    setThemeColor: (color: ThemeColor) => void;
    setMode: (mode: ThemeMode) => void;
}

export type AppearanceStore = AppearanceState & AppearanceActions;

export const useAppearanceStore = create<AppearanceStore>()(
    persist(
        (set) => ({
            themeColor: "violet",
            mode: "system",

            setThemeColor: (color) => {
                set({ themeColor: color });

                Cookies.set("work-mate-theme-color", color, { expires: 365, secure: true, sameSite: "lax" });

                if (typeof window !== "undefined") {
                    applyColorClass(color);
                }
            },

            setMode: (mode) => {
                set({ mode });
                Cookies.set("work-mate-mode", mode, { expires: 365, secure: true, sameSite: "lax" });
            },
        }),
        {
            name: "appearance",
            storage: createJSONStorage(() => localStorage),
        }
    )
);

function applyColorClass(color: string) {
    const root = document.documentElement;
    const colorClasses = ["theme-violet", "theme-rose", "theme-indigo", "theme-yellow", "theme-green"];
    root.classList.remove(...colorClasses);
    root.classList.add(`theme-${color}`);
}