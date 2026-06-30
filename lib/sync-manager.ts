import { toast } from "sonner";
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
  createFolderAction,
  updateFolderAction,
  deleteFolderAction,
  createTagAction,
  deleteTagAction,
} from "@/modules/notes/notes.actions";
import {
  createCalendarAction,
  deleteCalendarAction,
  createEventAction,
  deleteEventAction,
} from "@/modules/calendar/calendar.actions";
import { sendChatMessageAction } from "@/modules/chat/chat.actions";
import {
  getAllOfflineItems,
  deleteOfflineItem,
  saveOfflineItem,
  OfflineOp
} from "./offline-db";

export type SyncStatus = "online" | "offline" | "syncing" | "synced";

class SyncManager {
  private status: SyncStatus = "online";
  private listeners: Set<(status: SyncStatus, pendingCount: number) => void> = new Set();
  private syncInProgress = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.status = window.navigator.onLine ? "online" : "offline";
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public subscribe(listener: (status: SyncStatus, pendingCount: number) => void) {
    this.listeners.add(listener);
    // Get initial pending count
    this.getPendingCount().then((count) => listener(this.status, count));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.getPendingCount().then((count) => {
      this.listeners.forEach((listener) => listener(this.status, count));
    });
  }

  private async getPendingCount(): Promise<number> {
    if (typeof window === "undefined") return 0;
    const queue = await getAllOfflineItems<OfflineOp>("syncQueue");
    return queue.length;
  }

  private handleNetworkChange(online: boolean) {
    this.status = online ? "online" : "offline";
    this.notify();
    if (online) {
      this.startSync();
    }
  }

  public async startSync() {
    if (this.syncInProgress || typeof window === "undefined" || !window.navigator.onLine) {
      return;
    }

    const queue = await getAllOfflineItems<OfflineOp>("syncQueue");
    if (queue.length === 0) {
      this.status = "online";
      this.notify();
      return;
    }

    this.syncInProgress = true;
    this.status = "syncing";
    this.notify();

    const toastId = toast.loading(`Sincronizando ${queue.length} alteração(ões) com o servidor...`);
    const idMap = new Map<string, string>();

    // Sort queue by timestamp just in case
    queue.sort((a, b) => a.timestamp - b.timestamp);

    try {
      for (const op of queue) {
        await this.syncOperation(op, idMap);
        await deleteOfflineItem("syncQueue", op.id);
        this.notify();
      }

      toast.success("Sincronização concluída com sucesso!", { id: toastId });
      this.status = "synced";
      this.notify();

      // Clear sync status after 3 seconds back to online
      setTimeout(() => {
        if (this.status === "synced") {
          this.status = "online";
          this.notify();
        }
      }, 3000);

      // Force route reload to update server components
      window.location.reload();
    } catch (error) {
      console.error("Sync failed at operation:", error);
      toast.error("Erro na sincronização automática. Tentará novamente quando a rede estabilizar.", { id: toastId });
      this.status = "online"; // reset to online so it can try again
      this.notify();
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncOperation(op: OfflineOp, idMap: Map<string, string>) {
    const { actionName, payload } = op;

    // Resolve any temporary IDs in the payload from previous operations
    const resolvedPayload = this.resolveTempIds(payload, idMap) as {
      id: string;
      title?: string;
      folderId?: string | null;
      parentId?: string | null;
      type?: "note" | "task" | "pdf" | "excel";
      taskStatus?: "to_start" | "in_progress" | "done" | null;
      color?: string;
      updates?: Record<string, unknown>;
      summary?: string;
      backgroundColor?: string;
      foregroundColor?: string;
      content?: string;
      tempMsgId?: string;
      tempBotMsgId?: string;
      sessionId?: string;
      // Calendar event fields
      calendarId?: string;
      start?: { dateTime: string; timeZone?: string };
      end?: { dateTime: string; timeZone?: string };
      description?: string | null;
      status?: "confirmed" | "tentative" | "cancelled";
      location?: string;
    };

    switch (actionName) {
      case "createNote": {
        const { id: tempId, title, folderId, type, taskStatus } = resolvedPayload;
        const res = await createNoteAction({ title, folderId, type, taskStatus });
        if (res?.data?.success && res.data.note) {
          const serverId = res.data.note.id;
          idMap.set(tempId, serverId);
          // Update offline DB with the actual server note
          await deleteOfflineItem("notes", tempId);
          await saveOfflineItem("notes", res.data.note);
        } else {
          throw new Error(res?.serverError || "Erro ao criar nota no servidor");
        }
        break;
      }
      case "updateNote": {
        const { id: tempId, updates } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await updateNoteAction({
          id: realId,
          updates: updates as Parameters<typeof updateNoteAction>[0]["updates"],
        });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao atualizar nota no servidor");
        }
        break;
      }
      case "deleteNote": {
        const { id: tempId } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await deleteNoteAction({ id: realId });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao excluir nota no servidor");
        }
        break;
      }
      case "createFolder": {
        const { id: tempId, title, color, parentId } = resolvedPayload;
        const res = await createFolderAction({ title: title || "Nova Pasta", color, parentId });
        if (res?.data?.success && res.data.folder) {
          const serverId = res.data.folder.id;
          idMap.set(tempId, serverId);
          await deleteOfflineItem("folders", tempId);
          await saveOfflineItem("folders", res.data.folder);
        } else {
          throw new Error(res?.serverError || "Erro ao criar pasta no servidor");
        }
        break;
      }
      case "updateFolder": {
        const { id: tempId, updates } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await updateFolderAction({
          id: realId,
          updates: updates as Parameters<typeof updateFolderAction>[0]["updates"],
        });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao atualizar pasta no servidor");
        }
        break;
      }
      case "deleteFolder": {
        const { id: tempId } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await deleteFolderAction({ id: realId });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao excluir pasta no servidor");
        }
        break;
      }
      case "createTag": {
        const { id: tempId, title, color } = resolvedPayload;
        const res = await createTagAction({ title: title || "Nova Tag", color });
        if (res?.data?.success && res.data.tag) {
          const serverId = res.data.tag.id;
          idMap.set(tempId, serverId);
          await deleteOfflineItem("tags", tempId);
          await saveOfflineItem("tags", res.data.tag);
        } else {
          throw new Error(res?.serverError || "Erro ao criar tag no servidor");
        }
        break;
      }
      case "deleteTag": {
        const { id: tempId } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await deleteTagAction({ id: realId });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao excluir tag no servidor");
        }
        break;
      }
      case "createCalendar": {
        const { id: tempId, summary, backgroundColor, foregroundColor } = resolvedPayload;
        const res = await createCalendarAction({ summary: summary || "Nova Agenda", backgroundColor, foregroundColor });
        if (res?.data?.success && res.data.calendar) {
          const serverId = res.data.calendar.id;
          idMap.set(tempId, serverId);
          await deleteOfflineItem("calendars", tempId);
          await saveOfflineItem("calendars", res.data.calendar);
        } else {
          throw new Error(res?.serverError || "Erro ao criar agenda no servidor");
        }
        break;
      }
      case "deleteCalendar": {
        const { id: tempId } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await deleteCalendarAction({ id: realId });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao excluir agenda no servidor");
        }
        break;
      }
      case "createEvent": {
        const { id: tempId, calendarId, start, end, summary, description, status, location } = resolvedPayload;
        if (!calendarId || !start || !end || !summary) {
          throw new Error("Dados de evento insuficientes para criar evento no servidor.");
        }
        const res = await createEventAction({
          calendarId,
          start,
          end,
          summary,
          description,
          status,
          location,
        });
        if (res?.data?.success && res.data.event) {
          const serverId = res.data.event.id;
          idMap.set(tempId, serverId);
          await deleteOfflineItem("events", tempId);
          await saveOfflineItem("events", res.data.event);
        } else {
          throw new Error(res?.serverError || "Erro ao criar evento no servidor");
        }
        break;
      }
      case "deleteEvent": {
        const { id: tempId } = resolvedPayload;
        const realId = idMap.get(tempId) || tempId;
        const res = await deleteEventAction({ id: realId });
        if (!res?.data?.success) {
          throw new Error(res?.serverError || "Erro ao excluir evento no servidor");
        }
        break;
      }
      case "sendChatMessage": {
        const { sessionId: tempSessionId, content, tempMsgId, tempBotMsgId } = resolvedPayload;
        if (!content || !tempMsgId) {
          throw new Error("Dados de chat insuficientes para sincronização.");
        }
        const realSessionId = tempSessionId ? (idMap.get(tempSessionId) || tempSessionId) : undefined;

        const res = await sendChatMessageAction({
          sessionId: realSessionId,
          content,
        });

        if (res?.data?.success && res.data.message) {
          const serverMessage = res.data.message;
          const serverSessionId = res.data.sessionId;

          if (tempSessionId && serverSessionId) {
            idMap.set(tempSessionId, serverSessionId);
          }

          // Replace temporary client-side user/assistant messages with real ones
          await deleteOfflineItem("chatMessages", tempMsgId);
          if (tempBotMsgId) {
            await deleteOfflineItem("chatMessages", tempBotMsgId);
          }

          // Save the actual user message
          await saveOfflineItem("chatMessages", {
            id: serverMessage.id + "_user", // or actual server id if returned
            sessionId: serverSessionId,
            role: "user",
            content,
            createdAt: new Date(),
          });

          // Save the actual assistant message
          await saveOfflineItem("chatMessages", {
            ...serverMessage,
            sessionId: serverSessionId,
            createdAt: new Date(serverMessage.createdAt),
          });

          // System notification or custom visual notification
          toast.success("IA respondeu à sua pergunta offline!", {
            description: `Pergunta: "${content.substring(0, 30)}..."`,
          });

          // Fire Web Notification if authorized
          if (Notification.permission === "granted") {
            new Notification("Pergunta Respondida (WorkMate)", {
              body: serverMessage.content.substring(0, 100) + "...",
              icon: "/icons/android/launchericon-transparent-192x192.png",
            });
          }
        } else {
          throw new Error(res?.data?.error || "Erro ao enviar chat no servidor");
        }
        break;
      }
      default:
        console.warn("Unknown sync operation action:", actionName);
    }
  }

  private resolveTempIds(payload: unknown, idMap: Map<string, string>): unknown {
    if (!payload) return payload;

    // Deep clone
    const cloned = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

    const walk = (obj: Record<string, unknown> | unknown[]) => {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const item = obj[i];
          if (typeof item === "string") {
            const mappedValue = idMap.get(item);
            if (mappedValue) {
              obj[i] = mappedValue;
            }
          } else if (typeof item === "object" && item !== null) {
            walk(item as Record<string, unknown> | unknown[]);
          }
        }
      } else {
        for (const key in obj) {
          const value = obj[key];
          if (typeof value === "string") {
            const mappedValue = idMap.get(value);
            if (mappedValue) {
              obj[key] = mappedValue;
            }
          } else if (typeof value === "object" && value !== null) {
            walk(value as Record<string, unknown> | unknown[]);
          }
        }
      }
    };

    walk(cloned);
    return cloned;
  }
}

export const syncManager = new SyncManager();
