import { chatRepository } from "./chat.repository";
import { notesService } from "@/modules/notes/notes.service";
import { vectorService } from "@/modules/vector/vector.service";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const chatService = {
  async getSessions(userId: string, type: "active" | "archived" = "active") {
    if (type === "archived") {
      return chatRepository.getArchivedSessions(userId);
    }
    return chatRepository.getActiveSessions(userId);
  },

  async getMessages(userId: string, sessionId: string) {
    // ABAC/RBAC Check: Ensure the session belongs to this user
    const session = await chatRepository.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Sessão de chat não encontrada ou sem permissão.");
    }
    return chatRepository.getMessagesBySession(sessionId);
  },

  async createSession(userId: string, title: string) {
    const id = "chat_" + Math.random().toString(36).substring(2, 11);
    return chatRepository.createSession(userId, id, title);
  },

  async archiveSession(userId: string, sessionId: string, isArchived: boolean) {
    const session = await chatRepository.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Sessão não encontrada ou sem permissão.");
    }
    return chatRepository.archiveSession(userId, sessionId, isArchived);
  },

  async deleteSession(userId: string, sessionId: string) {
    const session = await chatRepository.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Sessão não encontrada ou sem permissão.");
    }
    return chatRepository.deleteSession(userId, sessionId);
  },

  async sendMessage(userId: string, sessionId: string, content: string) {
    // 1. Validate session ownership
    let session = await chatRepository.getSessionById(userId, sessionId);
    if (!session) {
      // Auto-create session if it doesn't exist
      const autoTitle = content.substring(0, 30) + (content.length > 30 ? "..." : "");
      session = await this.createSession(userId, autoTitle);
    }

    // Update session title dynamically if it was a default placeholder
    if (session.title.startsWith("Nova conversa") || session.title.trim() === "Chat") {
      const newTitle = content.substring(0, 30) + (content.length > 30 ? "..." : "");
      await chatRepository.updateSessionTitle(userId, session.id, newTitle);
    }

    // 2. Query vector embeddings (RAG)
    let relevantNotesContext = "";
    let maxPrecisionScore = 0; // pgvector similarity percentage
    
    // Processa qualquer item pendente na fila do usuário em tempo real antes de buscar
    try {
      await vectorService.processUserQueue(userId);
    } catch (err) {
      console.error("Erro ao processar fila pendente do usuário antes do chat:", err);
    }

    try {
      const searchResults = await vectorService.search(userId, content, 5);
      if (searchResults && searchResults.length > 0) {
        // Calculate pgvector precision: similarity = 1 - cosine_distance
        // Distance is stored in searchResults.distance
        const similarities = searchResults.map(r => 1 - (r.distance || 0));
        maxPrecisionScore = Math.max(...similarities) * 100;
        
        // Cap precision score within [0, 100]
        maxPrecisionScore = Math.max(0, Math.min(100, maxPrecisionScore));

        const sourceIds = searchResults.map((r) => r.sourceId);
        const notes = await notesService.getNotes(userId);
        const matchingNotes = notes.filter((n) => sourceIds.includes(n.id) && !n.trashed && !n.archived);
        
        relevantNotesContext = matchingNotes.map(n => {
          return `[CONTEÚDO DETALHADO DA NOTA/TAREFA: ${n.title} (ID: ${n.id})]
${notesService.getFormattedContent(n)}`;
        }).join("\n\n");
      }
    } catch (err) {
      console.error("Erro na busca vetorial RAG:", err);
    }

    // 3. Load active notes & tasks for prompt context summary
    let globalSummaryContext = "";
    try {
      const allNotes = await notesService.getNotes(userId);
      const activeItems = allNotes.filter(n => !n.trashed && !n.archived);
      
      globalSummaryContext = activeItems.map(n => {
        let details = `ID: ${n.id} | Tipo: ${n.type} | Título: ${n.title}`;
        if (n.type === "task") {
          const totalSub = n.taskSubtasks?.length || 0;
          const completedSub = n.taskSubtasks?.filter(s => s.completed).length || 0;
          details += ` | Status: ${n.taskStatus || "todo"} | Subtarefas: ${completedSub} de ${totalSub} concluídas`;
          if (n.taskSubtasks && n.taskSubtasks.length > 0) {
            details += `\n  Subtarefas detalhadas:\n` + n.taskSubtasks.map(s => `  - [${s.completed ? "x" : " "}] ${s.title}`).join("\n");
          }
        }
        return details;
      }).join("\n---\n");
    } catch (err) {
      console.error("Erro ao carregar sumário para o prompt:", err);
    }

    // 4. Save the user's message in the database
    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 11);
    await chatRepository.createMessage({
      id: userMsgId,
      sessionId: session.id,
      role: "user",
      content,
    });

    // 5. Build prompt system instructions
    const systemInstruction = `Você é o Assistente IA do WorkMate, um assistente inteligente integrado ao painel de estudos do usuário.
Seu objetivo é ajudar o usuário com seus resumos, anotações e organização de tarefas.

INSTRUÇÕES CRICIAIS DE FORMATAÇÃO E RESPOSTA:
1. Responda em português de forma clara, amigável e objetiva. Use negritos, listas e títulos curtos.
2. Quando mencionar ou citar uma nota ou arquivo PDF específico que exista nas listas de contexto, você DEVE criar um link em formato markdown para o usuário poder clicar e abri-lo:
   - Para Notas ou PDFs: [Título da Nota](/hub/notes/ID_DA_NOTA)
   - Exemplo: "Você pode ler mais sobre isso no seu resumo [Aula de Bioquímica](/hub/notes/note_123)."
3. Quando mencionar uma tarefa específica que exista nas listas de contexto, você DEVE criar um link em formato markdown apontando para o painel de tarefas com o id correspondente:
   - Para Tarefas: [Título da Tarefa](/hub/tasks?taskId=ID_DA_TAREFA)
   - Exemplo: "Vi que a tarefa [Comprar Livro](/hub/tasks?taskId=note_456) ainda está pendente."
4. Ao falar sobre tarefas, você tem acesso às subtarefas e ao status de conclusão delas. Mostre que sabe quais estão concluídas e quais estão pendentes caso o usuário pergunte.

Abaixo estão as informações reais do usuário (notas e tarefas) para você usar como contexto:

=== SUMÁRIO GERAL DE NOTAS E TAREFAS ATIVAS ===
${globalSummaryContext || "Nenhuma nota ou tarefa ativa cadastrada."}
==============================================

=== CONTEÚDO DETALHADO DE ITENS RELEVANTES ===
${relevantNotesContext || "Nenhum conteúdo detalhado adicional relevante encontrado."}
==============================================`;

    if (!genAI) {
      throw new Error("Chave de API do Gemini não configurada.");
    }

    // Fetch conversation history
    const historyMessages = await chatRepository.getMessagesBySession(session.id);
    // Convert to Gemini API structure, excluding the very last user message we just saved
    const contents = historyMessages
      .filter(m => m.id !== userMsgId)
      .map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: content }],
    });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Generate AI Content
    const result = await model.generateContent({
      contents,
      systemInstruction,
    });

    const replyText = result.response.text();
    const metadata = result.response.usageMetadata;
    
    // Calculate cost metrics
    const promptTokens = metadata?.promptTokenCount || 0;
    const candidatesTokens = metadata?.candidatesTokenCount || 0;
    // Input cost: $0.075 / 1M. Output cost: $0.30 / 1M.
    const calculatedCost = (promptTokens * 0.075 + candidatesTokens * 0.30) / 1000000;

    // 6. Save the assistant's reply with metrics in the database
    const assistantMsgId = "msg_" + Math.random().toString(36).substring(2, 11);
    const dbMessage = await chatRepository.createMessage({
      id: assistantMsgId,
      sessionId: session.id,
      role: "assistant",
      content: replyText,
      promptTokens,
      candidatesTokens,
      cost: calculatedCost.toFixed(6),
      precision: maxPrecisionScore > 0 ? maxPrecisionScore.toFixed(2) : null,
    });

    return {
      message: dbMessage,
      sessionId: session.id,
    };
  },
};
