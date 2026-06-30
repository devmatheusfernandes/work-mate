import { chatRepository } from "./chat.repository";
import { notesService } from "@/modules/notes/notes.service";
import { vectorService } from "@/modules/vector/vector.service";
import { calendarService } from "@/modules/calendar/calendar.service";
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

  async sendMessage(userId: string, sessionId: string, content: string, skipAiResponse?: boolean) {
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

    // Fetch conversation history early to inspect for references and construct history
    const historyMessages = await chatRepository.getMessagesBySession(session.id);

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

    // 2.5 Find and fetch direct references (notes, tasks, calendars)
    let directReferencesContext = "";
    try {
      // Scan current message and last 4 history messages to retrieve any referenced note/task IDs
      const recentContextText = [
        content,
        ...historyMessages.slice(-4).map(m => m.content)
      ].join("\n");

      // Matches both note link path: /hub/notes/ID and task link path: /hub/tasks?taskId=ID
      const noteIds = Array.from(new Set([
        ...Array.from(recentContextText.matchAll(/\/hub\/notes\/([a-zA-Z0-9_-]+)/g)).map(m => m[1]),
        ...Array.from(recentContextText.matchAll(/\/hub\/tasks\?taskId=([a-zA-Z0-9_-]+)/g)).map(m => m[1])
      ]));
      
      const noteRefs: string[] = [];
      for (const id of noteIds) {
        try {
          const note = await notesService.getNote(userId, id);
          if (note && !note.trashed && !note.archived) {
            noteRefs.push(`[CONTEÚDO DETALHADO DA NOTA/TAREFA REFERENCIADA: ${note.title} (ID: ${note.id})]
${notesService.getFormattedContent(note)}`);
          }
        } catch (e) {
          console.error(`Erro ao buscar nota/tarefa referenciada ${id}:`, e);
        }
      }
      if (noteRefs.length > 0) {
        directReferencesContext += "\n\n=== NOTAS/TAREFAS REFERENCIADAS DIRETAMENTE PELO USUÁRIO ===\n" + noteRefs.join("\n\n");
      }
    } catch (err) {
      console.error("Erro ao processar notas/tarefas referenciadas:", err);
    }

    try {
      const calendarIds = Array.from(new Set(
        Array.from(content.matchAll(/calendar:([a-zA-Z0-9_-]+)/g)).map(m => m[1])
      ));
      
      const calRefs: string[] = [];
      const allEvents = await calendarService.getEvents(userId);
      const calendars = await calendarService.getCalendars(userId);
      for (const id of calendarIds) {
        try {
          const cal = calendars.find(c => c.id === id) || await calendarService.getCalendar(userId, id);
          if (cal) {
            const calEvents = allEvents.filter(e => e.calendarId === id);
            const eventsText = calEvents.length > 0
              ? calEvents.map(e => {
                  const startStr = new Date(e.start.dateTime).toLocaleString("pt-BR", { timeZone: e.start.timeZone });
                  const endStr = new Date(e.end.dateTime).toLocaleString("pt-BR", { timeZone: e.end.timeZone });
                  return `- ${e.summary}: ${startStr} até ${endStr}${e.location ? ` | Local: ${e.location}` : ""}${e.description ? ` | Descrição: ${e.description}` : ""}`;
                }).join("\n")
              : "Nenhum compromisso agendado neste calendário.";
            
            calRefs.push(`[COMPROMISSOS DO CALENDÁRIO REFERENCIADO: ${cal.summary} (ID: ${cal.id})]
${eventsText}`);
          }
        } catch (e) {
          console.error(`Erro ao buscar calendário referenciado ${id}:`, e);
        }
      }
      if (calRefs.length > 0) {
        directReferencesContext += "\n\n=== CALENDÁRIOS REFERENCIADOS DIRETAMENTE PELO USUÁRIO ===\n" + calRefs.join("\n\n");
      }
    } catch (err) {
      console.error("Erro ao processar calendários referenciados:", err);
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

    // 3.5 Load calendars & events for prompt context
    let calendarContext = "";
    try {
      const calendars = await calendarService.getCalendars(userId);
      const events = await calendarService.getEvents(userId);
      
      const calendarList = calendars.map(c => `- ${c.summary} (${c.sharedUrl ? "Compartilhado/Importado" : "Local"})`).join("\n");
      
      let eventsList = "";
      if (events.length > 0) {
        const sortedEvents = [...events].sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());
        eventsList = sortedEvents.map(e => {
          const cal = calendars.find(c => c.id === e.calendarId);
          const startStr = new Date(e.start.dateTime).toLocaleString("pt-BR", { timeZone: e.start.timeZone });
          const endStr = new Date(e.end.dateTime).toLocaleString("pt-BR", { timeZone: e.end.timeZone });
          return `- [${cal?.summary || "Agenda"}] ${e.summary}: ${startStr} até ${endStr}${e.location ? ` | Local: ${e.location}` : ""}${e.description ? ` | Descrição: ${e.description}` : ""}`;
        }).join("\n");
      } else {
        eventsList = "Nenhum compromisso agendado.";
      }
      
      calendarContext = `Calendários Ativos:\n${calendarList}\n\nCompromissos:\n${eventsList}`;
    } catch (err) {
      console.error("Erro ao carregar contexto de calendário para o prompt:", err);
    }

    // 4. Save the user's message in the database
    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 11);
    const userMessage = await chatRepository.createMessage({
      id: userMsgId,
      sessionId: session.id,
      role: "user",
      content,
    });

    if (skipAiResponse) {
      return {
        message: userMessage,
        sessionId: session.id,
      };
    }

    // 5. Build prompt system instructions
    const systemDateStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const systemInstruction = `Você é o Assistente IA do WorkMate, um assistente inteligente integrado ao painel de estudos do usuário.
Seu objetivo é ajudar o usuário com seus resumos, anotações, organização de tarefas e compromissos de agenda.

A data e hora atual do sistema (hoje) é: ${systemDateStr} (Horário de Brasília). Use sempre esta data e hora como referência absoluta para interpretar expressões temporais do usuário como "hoje", "amanhã", "ontem", "esta semana" ou "próxima segunda-feira".

INSTRUÇÕES CRITICAS DE FORMATAÇÃO E RESPOSTA:
1. Responda em português de forma clara, amigável e objetiva. Use negritos, listas e títulos curtos.
2. Quando mencionar ou citar uma nota, arquivo PDF ou planilha Excel específico que exista nas listas de contexto, você DEVE criar um link em formato markdown para o usuário poder clicar e abri-lo:
   - Para Notas, PDFs ou Planilhas: [Título](/hub/notes/ID)
   - Exemplo: "Você pode conferir os valores na planilha [Gastos Mensais](/hub/notes/note_123)."
3. Quando mencionar uma tarefa específica que exista nas listas de contexto, você DEVE criar um link em formato markdown apontando para o painel de tarefas com o id correspondente:
   - Para Tarefas: [Título da Tarefa](/hub/tasks?taskId=ID_DA_TAREFA)
   - Exemplo: "Vi que a tarefa [Comprar Livro](/hub/tasks?taskId=note_456) ainda está pendente."
4. Ao falar sobre tarefas, você tem acesso às subtarefas e ao status de conclusão delas. Mostre que sabe quais estão concluídas e quais estão pendentes caso o usuário pergunte.
5. Você também tem acesso aos compromissos da agenda do usuário (calendários e eventos). Se o usuário perguntar sobre o que ele tem para fazer, reuniões, compromissos em datas específicas ou cronograma, consulte o contexto de calendário fornecido e responda de forma organizada e cronológica.
6. AÇÕES INTERATIVAS PARA CRIAR ITENS: Sempre que você recomendar ativamente que o usuário crie uma nova Tarefa ou Nota, você DEVE gerar um bloco de código JSON especial (com a linguagem "json") contendo os dados completos da tarefa ou nota. O formato deve ser exato:

Para criar uma TAREFA:
\`\`\`json
{
  "action": "create-task",
  "title": "Nome da Tarefa",
  "taskDeadline": "YYYY-MM-DDTHH:mm:ssZ",
  "taskSubtasks": ["Fazer isso", "Fazer aquilo"]
}
\`\`\`

Para criar uma NOTA:
\`\`\`json
{
  "action": "create-note",
  "title": "Nome da Nota",
  "content": "Conteúdo rico da nota (pode conter markdown, resumos detalhados e tópicos)"
}
\`\`\`

O usuário verá um botão mágico no lugar desse JSON para criar o item instantaneamente! Não use mais o formato de link antigo. Use sempre o bloco JSON quando quiser oferecer a criação de algo.

Abaixo estão as informações reais do usuário (notas, tarefas e compromissos da agenda) para você usar como contexto:

=== SUMÁRIO GERAL DE NOTAS E TAREFAS ATIVAS ===
${globalSummaryContext || "Nenhuma nota ou tarefa ativa cadastrada."}
==============================================

=== CONTEXTO DE CALENDÁRIO E AGENDA ===
${calendarContext || "Nenhum calendário ou compromisso disponível."}
=======================================

=== CONTEÚDO DETALHADO DE ITENS RELEVANTES ===
${relevantNotesContext || "Nenhum conteúdo detalhado adicional relevante encontrado."}
==============================================${directReferencesContext}`;

    if (!genAI) {
      throw new Error("Chave de API do Gemini não configurada.");
    }

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

  async saveAudioMessages(userId: string, sessionId: string, userText: string, assistantText: string) {
    const session = await chatRepository.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Sessão não encontrada ou sem permissão.");
    }

    const userMsgId = "msg_" + Math.random().toString(36).substring(2, 11);
    const userMessage = await chatRepository.createMessage({
      id: userMsgId,
      sessionId: session.id,
      role: "user",
      content: userText,
    });

    const assistantMsgId = "msg_" + Math.random().toString(36).substring(2, 11);
    const assistantMessage = await chatRepository.createMessage({
      id: assistantMsgId,
      sessionId: session.id,
      role: "assistant",
      content: assistantText,
    });

    return {
      userMessage,
      assistantMessage,
      sessionId: session.id,
    };
  },

  async convertChatToNote(userId: string, sessionId: string) {
    const session = await chatRepository.getSessionById(userId, sessionId);
    if (!session) {
      throw new Error("Sessão não encontrada ou sem permissão.");
    }
    
    const messages = await chatRepository.getMessagesBySession(sessionId);
    if (!messages || messages.length === 0) {
      throw new Error("Não há mensagens nesta conversa para resumir.");
    }

    const chatContent = messages.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join("\n\n");

    const systemInstruction = `Você é um especialista em sumarização de conversas. Seu objetivo é resumir o chat fornecido em uma Nota organizada em formato Markdown, focando nas decisões tomadas, ideias principais, e tarefas mencionadas. Formate com Títulos e Bullet Points. NÃO adicione introduções ou conclusões genéricas, apenas entregue o conteúdo da nota.`;

    if (!genAI) {
      throw new Error("Chave de API do Gemini não configurada.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: chatContent }] }],
      systemInstruction,
    });

    const summary = result.response.text();

    const note = await notesService.createNote(userId, {
      title: `Resumo: ${session.title}`,
      content: summary,
      type: "note",
      archived: false,
      trashed: false,
      pinned: false,
      isLocked: false,
      tagIds: [],
    });

    return note;
  },
};
