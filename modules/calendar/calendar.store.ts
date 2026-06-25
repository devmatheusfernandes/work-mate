import { create } from "zustand";
import { Calendar, CalendarEvent } from "./calendar.schema";
import {
  getCalendarsAction,
  getEventsAction,
  createCalendarAction,
  deleteCalendarAction,
  importSharedCalendarAction,
  syncCalendarAction,
} from "./calendar.actions";
import { toast } from "sonner";
import {
  saveOfflineItem,
  deleteOfflineItem,
  getAllOfflineItems,
  saveOfflineItemsBatch,
} from "@/lib/offline-db";

interface CalendarState {
  isSidebarOpen: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  activeCalendarIds: string[];
  calendars: Calendar[];
  events: CalendarEvent[];
  isLoading: boolean;
  
  // Sidebar actions
  setSidebarOpen: (isOpen: boolean) => void;
  setSelectedDate: (date: string) => void;
  navigateDay: (direction: "prev" | "next") => void;
  setToday: () => void;
  
  // Data actions
  fetchCalendars: () => Promise<void>;
  fetchEvents: () => Promise<void>;
  toggleCalendarFilter: (calendarId: string) => void;
  
  // Mutations
  addCalendar: (summary: string, backgroundColor: string) => Promise<boolean>;
  importCalendar: (url: string, backgroundColor: string) => Promise<boolean>;
  syncCalendar: (id: string) => Promise<boolean>;
  removeCalendar: (id: string) => Promise<boolean>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  isSidebarOpen: false,
  selectedDate: new Date().toISOString().split("T")[0],
  activeCalendarIds: [],
  calendars: [],
  events: [],
  isLoading: false,

  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  navigateDay: (direction) => {
    const current = new Date(get().selectedDate + "T12:00:00"); // Add timezone offset safety
    if (direction === "prev") {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    set({ selectedDate: current.toISOString().split("T")[0] });
  },

  setToday: () => {
    set({ selectedDate: new Date().toISOString().split("T")[0] });
  },

  fetchCalendars: async () => {
    set({ isLoading: true });
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const dbCalendars = await getAllOfflineItems<Calendar>("calendars");
      if (dbCalendars.length > 0) {
        const activeIds = get().activeCalendarIds.length === 0
          ? dbCalendars.map((c) => c.id)
          : get().activeCalendarIds.filter((id) => dbCalendars.some((c) => c.id === id));
        set({ calendars: dbCalendars, activeCalendarIds: activeIds });
      }
      set({ isLoading: false });
      return;
    }

    try {
      const result = await getCalendarsAction({});
      if (result?.data?.success && result.data.calendars) {
        const calendars = result.data.calendars;
        await saveOfflineItemsBatch("calendars", calendars);
        // Default all calendar IDs as active if filter is empty
        const activeIds = get().activeCalendarIds.length === 0
          ? calendars.map((c) => c.id)
          : get().activeCalendarIds.filter((id) => calendars.some((c) => c.id === id));
        set({ calendars, activeCalendarIds: activeIds });
      }
    } catch (err) {
      console.error("Error fetching calendars:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchEvents: async () => {
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const dbEvents = await getAllOfflineItems<CalendarEvent>("events");
      if (dbEvents.length > 0) {
        set({ events: dbEvents });
      }
      return;
    }

    try {
      const result = await getEventsAction({});
      if (result?.data?.success && result.data.events) {
        const events = result.data.events;
        await saveOfflineItemsBatch("events", events);
        set({ events });
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  },

  toggleCalendarFilter: (calendarId) => {
    const active = get().activeCalendarIds;
    if (active.includes(calendarId)) {
      set({ activeCalendarIds: active.filter((id) => id !== calendarId) });
    } else {
      set({ activeCalendarIds: [...active, calendarId] });
    }
  },

  addCalendar: async (summary, backgroundColor) => {
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const tempId = `temp_cal_${Date.now()}`;
      const newCal: Calendar = {
        userId: "local",
        id: tempId,
        summary,
        backgroundColor,
        foregroundColor: "text-white",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sharedUrl: null,
      };

      try {
        await saveOfflineItem("calendars", newCal);
        await saveOfflineItem("syncQueue", {
          id: `op_${tempId}`,
          actionName: "createCalendar",
          payload: {
            id: tempId,
            summary,
            backgroundColor,
            foregroundColor: "text-white",
          },
          timestamp: Date.now(),
        });

        set((state) => ({
          calendars: [...state.calendars, newCal],
          activeCalendarIds: [...state.activeCalendarIds, tempId],
        }));

        toast.success("Agenda adicionada offline!");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao adicionar agenda offline.");
        return false;
      }
    }

    const toastId = toast.loading("Adicionando agenda...");
    try {
      const result = await createCalendarAction({
        summary,
        backgroundColor,
        foregroundColor: "text-white",
      });
      if (result?.data?.success && result.data.calendar) {
        const cal = result.data.calendar;
        await saveOfflineItem("calendars", cal);
        toast.success("Agenda adicionada com sucesso!", { id: toastId });
        await get().fetchCalendars();
        return true;
      } else {
        toast.error("Erro ao adicionar agenda.", { id: toastId });
        return false;
      }
    } catch {
      toast.error("Erro ao adicionar agenda.", { id: toastId });
      return false;
    }
  },

  importCalendar: async (url, backgroundColor) => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      toast.error("Importação de agenda compartilhada requer internet.");
      return false;
    }

    const toastId = toast.loading("Importando agenda compartilhada...");
    try {
      const result = await importSharedCalendarAction({
        url,
        backgroundColor,
      });
      if (result?.data?.success && result.data.calendar) {
        const cal = result.data.calendar;
        await saveOfflineItem("calendars", cal);
        toast.success("Agenda importada com sucesso!", { id: toastId });
        await get().fetchCalendars();
        await get().fetchEvents();
        return true;
      } else {
        toast.error("Erro ao importar agenda.", { id: toastId });
        return false;
      }
    } catch {
      toast.error("Erro ao importar agenda.", { id: toastId });
      return false;
    }
  },

  syncCalendar: async (id) => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      toast.error("Sincronização de agenda externa requer internet.");
      return false;
    }

    const toastId = toast.loading("Sincronizando agenda...");
    try {
      const result = await syncCalendarAction({ id });
      if (result?.data?.success) {
        toast.success("Agenda sincronizada com sucesso!", { id: toastId });
        await get().fetchEvents();
        return true;
      } else {
        toast.error("Erro ao sincronizar agenda.", { id: toastId });
        return false;
      }
    } catch {
      toast.error("Erro ao sincronizar agenda.", { id: toastId });
      return false;
    }
  },

  removeCalendar: async (id) => {
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      try {
        await deleteOfflineItem("calendars", id);
        await saveOfflineItem("syncQueue", {
          id: `op_del_cal_${id}_${Date.now()}`,
          actionName: "deleteCalendar",
          payload: { id },
          timestamp: Date.now(),
        });

        set((state) => ({
          calendars: state.calendars.filter((c) => c.id !== id),
          activeCalendarIds: state.activeCalendarIds.filter((cid) => cid !== id),
        }));

        toast.success("Agenda removida offline!");
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro ao remover agenda offline.");
        return false;
      }
    }

    const toastId = toast.loading("Removendo agenda...");
    try {
      const result = await deleteCalendarAction({ id });
      if (result?.data?.success) {
        await deleteOfflineItem("calendars", id);
        toast.success("Agenda removida com sucesso!", { id: toastId });
        // Clean up from active filter
        set({
          activeCalendarIds: get().activeCalendarIds.filter((cid) => cid !== id),
        });
        await get().fetchCalendars();
        await get().fetchEvents();
        return true;
      } else {
        toast.error("Erro ao remover agenda.", { id: toastId });
        return false;
      }
    } catch {
      toast.error("Erro ao remover agenda.", { id: toastId });
      return false;
    }
  },
}));
