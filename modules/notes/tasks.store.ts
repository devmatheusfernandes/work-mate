import { create } from "zustand";
import { Note } from "./notes.schema";
import { getNotesAction } from "./notes.actions";
import { getAllOfflineItems, saveOfflineItem } from "@/lib/offline-db";
import { toast } from "sonner";

type UpdateListener = (id: string, updates: Partial<Note>) => void;
let updateListeners: UpdateListener[] = [];

export const subscribeToTaskUpdates = (listener: UpdateListener) => {
  updateListeners.push(listener);
  return () => {
    updateListeners = updateListeners.filter((l) => l !== listener);
  };
};

export const notifyTaskUpdate = (id: string, updates: Partial<Note>) => {
  updateListeners.forEach((l) => l(id, updates));
};

interface TasksState {
  tasks: Note[];
  isOpen: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  
  setIsOpen: (open: boolean) => void;
  setIsExpanded: (expanded: boolean) => void;
  setTasks: (tasks: Note[]) => void;
  fetchTasks: () => Promise<void>;
  updateTaskOptimistic: (
    id: string,
    updates: Partial<Note>,
    apiCall: () => Promise<{ data?: { success?: boolean } } | undefined>
  ) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isOpen: false,
  isExpanded: false,
  isLoading: false,

  setIsOpen: (open) => set({ isOpen: open }),
  setIsExpanded: (expanded) => set({ isExpanded: expanded }),
  setTasks: (tasks) => set({ tasks }),

  fetchTasks: async () => {
    set({ isLoading: true });
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
    if (isOffline) {
      const dbNotes = await getAllOfflineItems<Note>("notes");
      const dbTasks = dbNotes.filter((n) => n.type === "task" && !n.archived && !n.trashed);
      set({ tasks: dbTasks, isLoading: false });
      return;
    }

    try {
      const res = await getNotesAction({});
      if (res?.data?.success && res.data.notes) {
        const dbTasks = res.data.notes.filter((n: Note) => n.type === "task" && !n.archived && !n.trashed);
        set({ tasks: dbTasks });
      }
    } catch (err) {
      console.error("Erro ao buscar tarefas:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateTaskOptimistic: async (id, updates, apiCall) => {
    const prevTasks = [...get().tasks];
    
    // Update local state
    set((state) => {
      const updatedTasks = state.tasks
        .map((t) => {
          if (t.id === id) {
            return { ...t, ...updates } as Note;
          }
          return t;
        })
        .filter((t) => t.type === "task" && !t.archived && !t.trashed);
      return { tasks: updatedTasks };
    });

    // Notify other observers/listeners (like the dashboard)
    notifyTaskUpdate(id, updates);

    // Save locally to offline DB
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      const dbNotes = await getAllOfflineItems<Note>("notes");
      const note = dbNotes.find((n) => n.id === id);
      if (note) {
        const newNote = { ...note, ...updates } as Note;
        await saveOfflineItem("notes", newNote);
      }
      
      const syncOp = {
        id: `op_${id}_${Date.now()}`,
        actionName: "updateNote",
        payload: { id, updates },
        timestamp: Date.now(),
      };
      await saveOfflineItem("syncQueue", syncOp);
      toast.success("Alteração salva localmente (offline)");
      return;
    }

    try {
      const result = await apiCall();
      if (!result?.data?.success) {
        // Rollback state on error
        set({ tasks: prevTasks });
        // Notify rollback to listeners
        const rolledBackTask = prevTasks.find((t) => t.id === id);
        if (rolledBackTask) {
          notifyTaskUpdate(id, rolledBackTask);
        }
        toast.error("Erro ao sincronizar alteração.");
      } else {
        // Save to IndexedDB
        const dbNotes = await getAllOfflineItems<Note>("notes");
        const note = dbNotes.find((n) => n.id === id);
        if (note) {
          const newNote = { ...note, ...updates } as Note;
          await saveOfflineItem("notes", newNote);
        }
      }
    } catch (err) {
      console.error(err);
      // Rollback state on connection failure
      set({ tasks: prevTasks });
      const rolledBackTask = prevTasks.find((t) => t.id === id);
      if (rolledBackTask) {
        notifyTaskUpdate(id, rolledBackTask);
      }
      toast.error("Erro de conexão ao salvar alteração.");
    }
  }
}));
