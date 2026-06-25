import { create } from "zustand";
import { ChatMessage, ChatSession } from "./chat.types";
import { 
  getChatSessionsAction, 
  getChatMessagesAction, 
  createChatSessionAction, 
  sendChatMessageAction, 
  archiveChatSessionAction, 
  deleteChatSessionAction 
} from "./chat.actions";
import {
  saveOfflineItem,
  deleteOfflineItem,
  getAllOfflineItems,
  saveOfflineItemsBatch,
} from "@/lib/offline-db";
import { toast } from "sonner";

interface ChatState {
  sessions: ChatSession[];
  messages: ChatMessage[];
  currentSessionId: string | null;
  isSidebarOpen: boolean;
  isGenerating: boolean;
  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  
  setSidebarOpen: (open: boolean) => void;
  setCurrentSessionId: (sessionId: string | null) => Promise<void>;
  loadSessions: (type?: "active" | "archived") => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  createNewSession: () => Promise<string | null>;
  sendMessage: (content: string) => Promise<void>;
  archiveSession: (sessionId: string, isArchived: boolean) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  messages: [],
  currentSessionId: null,
  isSidebarOpen: false,
  isGenerating: false,
  isLoadingSessions: false,
  isLoadingMessages: false,
  
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  setCurrentSessionId: async (sessionId) => {
    set({ currentSessionId: sessionId });
    if (sessionId) {
      await get().loadMessages(sessionId);
    } else {
      set({ messages: [] });
    }
  },

  loadSessions: async (type = "active") => {
    set({ isLoadingSessions: true });
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const dbSessions = await getAllOfflineItems<ChatSession>("chatSessions");
      if (dbSessions.length > 0) {
        set({ sessions: dbSessions });
      }
      set({ isLoadingSessions: false });
      return;
    }

    try {
      const res = await getChatSessionsAction({ type });
      if (res?.data?.success && res.data.sessions) {
        // Convert date strings/timestamps to Date objects
        type RawSession = Omit<ChatSession, "createdAt" | "updatedAt"> & { createdAt: string | Date; updatedAt: string | Date };
        const sessions = (res.data.sessions as RawSession[]).map((s) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }));
        await saveOfflineItemsBatch("chatSessions", sessions);
        set({ sessions });
      }
    } catch (error) {
      console.error("Erro ao carregar sessões de chat:", error);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  loadMessages: async (sessionId) => {
    set({ isLoadingMessages: true });
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      type OfflineChatMessage = Omit<ChatMessage, "createdAt"> & { createdAt: string | Date; sessionId?: string | null };
      const dbMessages = await getAllOfflineItems<OfflineChatMessage>("chatMessages");
      const filtered = dbMessages.filter((m) => m.sessionId === sessionId);
      const messages = filtered.map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      } as ChatMessage));
      set({ messages });
      set({ isLoadingMessages: false });
      return;
    }

    try {
      const res = await getChatMessagesAction({ sessionId });
      if (res?.data?.success && res.data.messages) {
        type RawMessage = Omit<ChatMessage, "createdAt"> & { createdAt: string | Date };
        const messages = (res.data.messages as RawMessage[]).map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
        await saveOfflineItemsBatch("chatMessages", messages);
        set({ messages });
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  createNewSession: async () => {
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      const tempId = `temp_session_${Date.now()}`;
      const newSession: ChatSession = {
        userId: "local",
        id: tempId,
        title: "Nova conversa",
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await saveOfflineItem("chatSessions", newSession);
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: tempId,
          messages: [],
        }));
        await saveOfflineItem("syncQueue", {
          id: `op_${tempId}`,
          actionName: "createFolder", // reuse createFolder or make a sync operation for createSession if supported
          payload: {
            id: tempId,
            title: "Nova conversa",
          },
          timestamp: Date.now(),
        });
        return tempId;
      } catch (err) {
        console.error(err);
      }
      return null;
    }

    try {
      const res = await createChatSessionAction({ title: "Nova conversa" });
      if (res?.data?.success && res.data.session) {
        const session = res.data.session;
        await get().loadSessions();
        set({ currentSessionId: session.id, messages: [] });
        return session.id;
      }
    } catch (error) {
      console.error("Erro ao criar nova sessão de chat:", error);
    }
    return null;
  },

  sendMessage: async (content: string) => {
    if (!content.trim() || get().isGenerating) return;

    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
    let actualSessionId = get().currentSessionId;

    const tempMsgId = "optimistic_" + Math.random().toString(36).substring(7);
    const tempBotMsgId = "msg_placeholder_" + Math.random().toString(36).substring(7);

    if (isOffline && !actualSessionId) {
      actualSessionId = `temp_session_${Date.now()}`;
      const newSession: ChatSession = {
        userId: "local",
        id: actualSessionId,
        title: content.substring(0, 30),
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await saveOfflineItem("chatSessions", newSession);
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSessionId: actualSessionId,
      }));
    }

    // Build optimistic user message
    const userMessage: ChatMessage = {
      id: tempMsgId,
      role: "user",
      content,
      createdAt: new Date(),
      promptTokens: null,
      candidatesTokens: null,
      cost: null,
      precision: null,
    };

    if (isOffline) {
      const assistantMessage: ChatMessage = {
        id: tempBotMsgId,
        role: "assistant",
        content: "Você está offline. Sua pergunta foi salva na fila e será respondida assim que você recuperar a conexão.",
        createdAt: new Date(),
        promptTokens: null,
        candidatesTokens: null,
        cost: null,
        precision: null,
      };

      set((state) => ({
        messages: [...state.messages, userMessage, assistantMessage],
        isGenerating: false,
      }));

      try {
        await saveOfflineItem("chatMessages", { ...userMessage, sessionId: actualSessionId });
        await saveOfflineItem("chatMessages", { ...assistantMessage, sessionId: actualSessionId });
        await saveOfflineItem("syncQueue", {
          id: `op_${tempMsgId}`,
          actionName: "sendChatMessage",
          payload: {
            sessionId: actualSessionId,
            content,
            tempMsgId,
            tempBotMsgId,
          },
          timestamp: Date.now(),
        });
        toast.info("Pergunta salva na fila offline.");
      } catch (err) {
        console.error(err);
      }
      return;
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isGenerating: true,
    }));

    const assistantMessageId = "msg_placeholder_" + Math.random().toString(36).substring(7);
    let responseText = "";
    type RawServerMessage = Omit<ChatMessage, "createdAt" | "role"> & { createdAt: string | Date; role: string };
    let serverMessage: RawServerMessage | null = null;

    try {
      const res = await sendChatMessageAction({ 
        sessionId: actualSessionId, 
        content 
      });

      if (res?.data?.success && res.data.message) {
        serverMessage = res.data.message as RawServerMessage;
        responseText = serverMessage.content;
        
        // If session was auto-created, update state with the new session
        if (!actualSessionId && res.data.sessionId) {
          actualSessionId = res.data.sessionId;
          set({ currentSessionId: actualSessionId });
          await get().loadSessions();
        }
      } else {
        responseText = res?.data?.error || "Desculpe, ocorreu um erro ao gerar a resposta.";
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem para IA:", error);
      responseText = "Desculpe, não consegui me conectar com a Inteligência Artificial.";
    }

    // Create assistant placeholder message
    const assistantMessage: ChatMessage = {
      id: serverMessage?.id || assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: serverMessage ? new Date(serverMessage.createdAt) : new Date(),
      promptTokens: serverMessage?.promptTokens || null,
      candidatesTokens: serverMessage?.candidatesTokens || null,
      cost: serverMessage?.cost || null,
      precision: serverMessage?.precision || null,
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
    }));

    // Stream simulation: output word-by-word
    const words = responseText.split(" ");
    let currentText = "";
    let wordIndex = 0;

    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === assistantMessage.id
                ? { ...msg, content: currentText }
                : msg
            ),
          }));
          wordIndex++;
        } else {
          clearInterval(interval);
          set({ isGenerating: false });
          resolve();
        }
      }, 25);
    });
  },

  archiveSession: async (sessionId, isArchived) => {
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      try {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (session) {
          const updated = { ...session, isArchived };
          await saveOfflineItem("chatSessions", updated);
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === sessionId ? updated : s)),
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
            messages: state.currentSessionId === sessionId ? [] : state.messages,
          }));
          await saveOfflineItem("syncQueue", {
            id: `op_arch_sess_${sessionId}_${Date.now()}`,
            actionName: "archiveSession", // we can ignore or add sync operation for archiving session
            payload: { sessionId, isArchived },
            timestamp: Date.now(),
          });
          toast.success(isArchived ? "Conversa arquivada offline!" : "Conversa desarquivada offline!");
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const res = await archiveChatSessionAction({ sessionId, isArchived });
      if (res?.data?.success) {
        await get().loadSessions();
        if (get().currentSessionId === sessionId) {
          set({ currentSessionId: null, messages: [] });
        }
      }
    } catch (error) {
      console.error("Erro ao arquivar sessão:", error);
    }
  },

  deleteSession: async (sessionId) => {
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      try {
        await deleteOfflineItem("chatSessions", sessionId);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
          messages: state.currentSessionId === sessionId ? [] : state.messages,
        }));
        await saveOfflineItem("syncQueue", {
          id: `op_del_sess_${sessionId}_${Date.now()}`,
          actionName: "deleteSession",
          payload: { sessionId },
          timestamp: Date.now(),
        });
        toast.success("Conversa excluída offline!");
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const res = await deleteChatSessionAction({ sessionId });
      if (res?.data?.success) {
        await get().loadSessions();
        if (get().currentSessionId === sessionId) {
          set({ currentSessionId: null, messages: [] });
        }
      }
    } catch (error) {
      console.error("Erro ao deletar sessão:", error);
    }
  },

  clearMessages: () => set({ messages: [] }),
}));
