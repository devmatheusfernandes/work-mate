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
    try {
      const res = await getChatMessagesAction({ sessionId });
      if (res?.data?.success && res.data.messages) {
        type RawMessage = Omit<ChatMessage, "createdAt"> & { createdAt: string | Date };
        const messages = (res.data.messages as RawMessage[]).map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }));
        set({ messages });
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  createNewSession: async () => {
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

    // Build optimistic user message
    const userMessage: ChatMessage = {
      id: "optimistic_" + Math.random().toString(36).substring(7),
      role: "user",
      content,
      createdAt: new Date(),
      promptTokens: null,
      candidatesTokens: null,
      cost: null,
      precision: null,
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isGenerating: true,
    }));

    const assistantMessageId = "msg_placeholder_" + Math.random().toString(36).substring(7);
    let responseText = "";
    type RawServerMessage = Omit<ChatMessage, "createdAt" | "role"> & { createdAt: string | Date; role: string };
    let serverMessage: RawServerMessage | null = null;
    let actualSessionId = get().currentSessionId;

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
      }, 25); // Faster streaming for responsive feeling
    });
  },

  archiveSession: async (sessionId, isArchived) => {
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
