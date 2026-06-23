import { create } from "zustand";
import { ChatMessage } from "./chat.types";

interface ChatState {
  messages: ChatMessage[];
  isSidebarOpen: boolean;
  isGenerating: boolean;
  setSidebarOpen: (open: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

// Custom responses helper based on keywords
const getMockResponse = (input: string): string => {
  const query = input.toLowerCase();
  
  if (query.includes("tarefa") || query.includes("task") || query.includes("kanban")) {
    return "Gerenciar tarefas é fundamental para manter o foco! No WorkMate, você pode usar a aba de **Tarefas** para organizar seus estudos nas raias de *A Fazer*, *Em Progresso* e *Concluído*.\n\nAlém disso, na tela de Notas, você pode arrastar qualquer nota para a barra lateral direita para convertê-la em tarefa instantaneamente! Quer que eu te ajude a estruturar um plano de tarefas para hoje?";
  }
  
  if (query.includes("nota") || query.includes("pasta") || query.includes("resumo")) {
    return "As notas no WorkMate suportam formatação rich text via editor TipTap! Você pode organizar tudo em pastas e subpastas de forma hierárquica.\n\nExperimente adicionar tags coloridas às suas notas para facilitar a busca rápida e a filtragem no dashboard principal. Qual assunto você está estudando hoje?";
  }
  
  if (query.includes("quem é você") || query.includes("ia") || query.includes("ajuda") || query.includes("gpt")) {
    return "Eu sou o **Assistente IA do WorkMate**! 🧠✨\n\nEstou aqui para te ajudar a:\n1. Organizar seu fluxo de estudos.\n2. Tirar dúvidas conceituais rapidamente.\n3. Criar cronogramas e listar tarefas a partir dos seus resumos.\n\nBasta me enviar uma pergunta ou pedir uma sugestão!";
  }

  return "Excelente pergunta! Posso te ajudar a estruturar essas ideias. \n\nNo WorkMate, você tem acesso a:\n- 📝 **Notas estruturadas** com pastas e tags\n- 🎯 **Quadro Kanban** completo para tarefas\n- ⏰ **Notificações** para prazos importantes\n\nComo prefere começar? Posso criar um roteiro de estudos ou detalhar alguma ferramenta para você.";
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isSidebarOpen: false,
  isGenerating: false,
  
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  
  sendMessage: async (content: string) => {
    if (!content.trim() || get().isGenerating) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content,
      createdAt: new Date(),
    };

    // 1. Optimistic UI: Add user message immediately
    set((state) => ({
      messages: [...state.messages, userMessage],
      isGenerating: true,
    }));

    // 2. Prepare mock AI response content
    const responseText = getMockResponse(content);
    
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Create placeholder message for the assistant
    const assistantMessageId = Math.random().toString(36).substring(7);
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
    }));

    // 3. Stream simulation: output word-by-word or character chunks
    const words = responseText.split(" ");
    let currentText = "";
    let wordIndex = 0;

    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
          set((state) => ({
            messages: state.messages.map((msg) =>
              msg.id === assistantMessageId
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
      }, 50); // Speed of streaming words
    });
  },

  clearMessages: () => set({ messages: [] }),
}));
