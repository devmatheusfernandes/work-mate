"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Paperclip, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  ArrowUp,
  Maximize2,
  Plus,
  Archive,
  Menu,
  X,
  FileText,
  CheckCircle2,
  Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatStore } from "../chat.store";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/modules/calendar/calendar.store";
import { getNotesAction } from "@/modules/notes/notes.actions";
import { Note } from "@/modules/notes/notes.schema";

interface ChatInterfaceProps {
  isSidebar?: boolean;
  onNavigateToFullPage?: () => void;
}

const SUGGESTIONS = [
  {
    title: "Organizar tarefas",
    prompt: "Criar plano de tarefas para organizar meus estudos hoje",
    icon: "🎯",
  },
  {
    title: "Uso de Notas",
    prompt: "Como posso usar as notas e pastas do WorkMate de forma eficiente?",
    icon: "📝",
  },
  {
    title: "Quadro Kanban",
    prompt: "O que é e como funciona o quadro Kanban no WorkMate?",
    icon: "📊",
  },
];

export function ChatInterface({
  isSidebar = false,
  onNavigateToFullPage,
}: ChatInterfaceProps) {
  const router = useRouter();
  const {
    sessions,
    messages,
    currentSessionId,
    isSidebarOpen,
    isGenerating,
    isLoadingSessions,
    isLoadingMessages,
    setSidebarOpen,
    setCurrentSessionId,
    loadSessions,
    createNewSession,
    sendMessage,
    archiveSession,
    deleteSession,
    clearMessages,
  } = useChatStore();

  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [sessionsType, setSessionsType] = useState<"active" | "archived">("active");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention / Reference states
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [mentionSearchText, setMentionSearchText] = useState("");
  const [mentionType, setMentionType] = useState<"@" | "/">("@");
  const [availableNotes, setAvailableNotes] = useState<{ id: string; title: string; type: string }[]>([]);
  const [availableCalendars, setAvailableCalendars] = useState<{ id: string; summary: string }[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [selectedReferences, setSelectedReferences] = useState<{ id: string; title: string; type: string }[]>([]);

  // Fetch mention context data
  useEffect(() => {
    const fetchMentionData = async () => {
      const storeCals = useCalendarStore.getState().calendars;
      if (storeCals.length === 0) {
        await useCalendarStore.getState().fetchCalendars();
      }
      setAvailableCalendars(useCalendarStore.getState().calendars);

      try {
        const res = await getNotesAction({});
        if (res?.data?.success && res.data.notes) {
          setAvailableNotes(res.data.notes.filter((n: Note) => !n.trashed && !n.archived));
        }
      } catch (err) {
        console.error("Error fetching notes for mentions:", err);
      }
    };
    
    fetchMentionData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, selectionStart);
    
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    const lastSlashIdx = textBeforeCursor.lastIndexOf("/");
    
    let activeTriggerIdx = -1;
    let activeType: "@" | "/" = "@";

    if (lastAtIdx > lastSlashIdx) {
      activeTriggerIdx = lastAtIdx;
      activeType = "@";
    } else if (lastSlashIdx > lastAtIdx) {
      activeTriggerIdx = lastSlashIdx;
      activeType = "/";
    }

    if (activeTriggerIdx !== -1) {
      const textAfterTrigger = textBeforeCursor.substring(activeTriggerIdx + 1);
      const charBeforeTrigger = activeTriggerIdx > 0 ? textBeforeCursor[activeTriggerIdx - 1] : "";
      const isValidTrigger = activeTriggerIdx === 0 || /\s/.test(charBeforeTrigger);
      
      if (isValidTrigger && !textAfterTrigger.includes("\n")) {
        setShowMentionSuggestions(true);
        setMentionTriggerIndex(activeTriggerIdx);
        setMentionType(activeType);
        setMentionSearchText(textAfterTrigger);
        setActiveSuggestionIndex(0);
        return;
      }
    }

    setShowMentionSuggestions(false);
  };

  const handleSelectMention = (item: { id: string; title: string; type: string }) => {
    // Remove the trigger character (@ or /) and any search query that was typed
    const textBeforeMention = inputValue.substring(0, mentionTriggerIndex);
    const textAfterMention = inputValue.substring(mentionTriggerIndex + mentionSearchText.length + 1);
    
    setInputValue(textBeforeMention + textAfterMention);
    setShowMentionSuggestions(false);
    
    // Add reference if not already added
    if (!selectedReferences.some((ref) => ref.id === item.id)) {
      setSelectedReferences((prev) => [...prev, item]);
    }
    
    if (textareaRef.current) {
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(mentionTriggerIndex, mentionTriggerIndex);
        }
      }, 0);
    }
  };

  const filteredSuggestions = (() => {
    if (mentionType === "@") {
      const allNotesAndTasks = availableNotes.map(n => ({
        id: n.id,
        title: n.title,
        type: n.type,
      }));
      return allNotesAndTasks.filter(item => 
        item.title.toLowerCase().includes(mentionSearchText.toLowerCase())
      );
    } else {
      const allCalendars = availableCalendars.map(c => ({
        id: c.id,
        title: c.summary,
        type: "calendar",
      }));
      return allCalendars.filter(item =>
        item.title.toLowerCase().includes(mentionSearchText.toLowerCase())
      );
    }
  })();

  // Load sessions list on mount and when sessionsType changes
  useEffect(() => {
    loadSessions(sessionsType);
  }, [loadSessions, sessionsType]);

  // Open sidebar by default on desktop if there are sessions
  useEffect(() => {
    if (!isSidebar && window.innerWidth >= 768 && sessions.length > 0) {
      setSidebarOpen(true);
    }
  }, [sessions.length, isSidebar, setSidebarOpen]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = async (text: string) => {
    if ((!text.trim() && selectedReferences.length === 0) || isGenerating) return;
    
    let finalContent = text.trim();
    if (selectedReferences.length > 0) {
      const refsText = selectedReferences.map(ref => {
        if (ref.type === "calendar") {
          return `[Agenda: ${ref.title}](calendar:${ref.id})`;
        } else if (ref.type === "task") {
          return `[Tarefa: ${ref.title}](/hub/tasks?taskId=${ref.id})`;
        } else {
          return `[Nota: ${ref.title}](/hub/notes/${ref.id})`;
        }
      }).join(" ");
      finalContent = finalContent ? `${finalContent}\n\n${refsText}` : refsText;
    }
    
    setInputValue("");
    setSelectedReferences([]);
    try {
      await sendMessage(finalContent);
    } catch {
      toast.error("Erro ao enviar mensagem.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelectMention(filteredSuggestions[activeSuggestionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleUploadSimulate = () => {
    toast.success("Upload simulado com sucesso! Arquivo anexado à conversa.", {
      description: "O assistente agora analisará o documento anexado.",
    });
  };

  const handleNewChat = async () => {
    const newId = await createNewSession();
    if (newId) {
      toast.success("Nova conversa iniciada!");
    }
  };

  const hasMessages = messages.length > 0;

  // Render markdown-like formatting in messages
  const renderMessageContent = (content: string) => {
    return content.split("\n").map((paragraph, index) => {
      // Bold text formatting **text**
      let formattedText = paragraph.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      
      // Inline code blocks `code`
      formattedText = formattedText.replace(/`(.*?)`/g, "<code class='bg-muted/80 px-1 py-0.5 rounded text-xs font-mono border border-border/20'>$1</code>");

      // Markdown links [text](url)
      formattedText = formattedText.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' class='text-blue-500 hover:text-blue-400 hover:underline font-bold transition-colors'>$1</a>");

      // Lists: check if paragraph starts with - or * or number.
      if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
        return (
          <li key={index} className="ml-4 list-disc text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: formattedText.substring(2) }} />
        );
      }
      
      if (/^\d+\.\s/.test(paragraph)) {
        const dotIndex = paragraph.indexOf(". ");
        return (
          <li key={index} className="ml-4 list-decimal text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: formattedText.substring(dotIndex + 2) }} />
        );
      }

      return (
        <p key={index} className="text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: formattedText }} />
      );
    });
  };

  return (
    <div className={cn(
      "flex h-full w-full overflow-hidden relative",
      isSidebar ? "bg-transparent" : "bg-background"
    )}>
      {/* 1. COLLAPSIBLE CONVERSATION HISTORY SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && !isSidebar && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="hidden md:flex flex-col shrink-0 h-full border-r border-border/30 bg-muted/5 select-none overflow-hidden"
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-3 border-b border-border/30 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversas</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                title="Nova conversa"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Tabs for Active/Archived */}
            <div className="flex border-b border-border/30 text-xs mt-2 p-1 bg-muted/20 rounded-lg mx-3 mb-2 shrink-0">
              <button
                onClick={() => setSessionsType("active")}
                className={cn(
                  "flex-1 py-1 rounded-md text-center transition-all cursor-pointer text-[11px]",
                  sessionsType === "active" 
                    ? "bg-card text-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Ativas
              </button>
              <button
                onClick={() => setSessionsType("archived")}
                className={cn(
                  "flex-1 py-1 rounded-md text-center transition-all cursor-pointer text-[11px]",
                  sessionsType === "archived" 
                    ? "bg-card text-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Arquivadas
              </button>
            </div>

            {/* Sessions list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
              {isLoadingSessions ? (
                <div className="text-[11px] text-muted-foreground text-center py-4">Carregando histórico...</div>
              ) : sessions.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 text-center py-8 italic">
                  Nenhuma conversa encontrada.
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={cn(
                      "group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-left transition-all relative border border-transparent",
                      session.id === currentSessionId
                        ? "bg-primary/10 border-primary/20 text-primary font-medium"
                        : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-10">
                      <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                      <span className="text-xs truncate">{session.title}</span>
                    </div>
                    
                    {/* Hover actions */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveSession(session.id, !session.isArchived);
                          toast.success(session.isArchived ? "Conversa desarquivada!" : "Conversa arquivada!");
                        }}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        title={session.isArchived ? "Desarquivar" : "Arquivar"}
                      >
                        <Archive className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Deseja excluir esta conversa definitivamente?")) {
                            deleteSession(session.id);
                            toast.success("Conversa excluída!");
                          }
                        }}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE DRAWER SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && !isSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-start select-none"
            onClick={() => setSidebarOpen(false)}
          >
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="w-64 h-full bg-background border-r border-border/30 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/30 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversas</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNewChat}
                    className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Nova conversa"
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex border-b border-border/30 text-xs mt-2 p-1 bg-muted/20 rounded-lg mx-3 mb-2 shrink-0">
                <button
                  onClick={() => setSessionsType("active")}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all cursor-pointer text-[11px]",
                    sessionsType === "active" 
                      ? "bg-card text-foreground font-semibold" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Ativas
                </button>
                <button
                  onClick={() => setSessionsType("archived")}
                  className={cn(
                    "flex-1 py-1 rounded-md text-center transition-all cursor-pointer text-[11px]",
                    sessionsType === "archived" 
                      ? "bg-card text-foreground font-semibold" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Arquivadas
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
                {isLoadingSessions ? (
                  <div className="text-[11px] text-muted-foreground text-center py-4">Carregando...</div>
                ) : sessions.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/60 text-center py-8 italic">Nenhuma conversa.</div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-left transition-all relative border border-transparent",
                        session.id === currentSessionId
                          ? "bg-primary/10 border-primary/20 text-primary font-medium"
                          : "hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-10">
                        <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                        <span className="text-xs truncate">{session.title}</span>
                      </div>
                      
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiveSession(session.id, !session.isArchived);
                            toast.success(session.isArchived ? "Desarquivada!" : "Arquivada!");
                          }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                        >
                          <Archive className="size-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Excluir conversa?")) {
                              deleteSession(session.id);
                            }
                          }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <div className={cn(
          "flex items-center justify-between h-12 border-b border-border/30 shrink-0 backdrop-blur-md z-10 px-4",
          isSidebar ? "bg-card/80 pl-11" : "bg-background/80"
        )}>
          <div className="flex items-center gap-2">
            {!isSidebar && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer mr-1"
                title={isSidebarOpen ? "Ocultar histórico" : "Exibir histórico"}
              >
                <Menu className="size-4" />
              </Button>
            )}
            <Sparkles className="size-4 text-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Assistente IA
            </span>
            {isGenerating && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {hasMessages && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors rounded-full shrink-0 cursor-pointer"
                onClick={clearMessages}
                title="Limpar conversa local"
              >
                <Trash2 className="size-4" />
              </Button>
            )}

            {isSidebar && onNavigateToFullPage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors rounded-full shrink-0 cursor-pointer"
                onClick={onNavigateToFullPage}
                title="Expandir para tela cheia"
              >
                <Maximize2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Conversation messages */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!hasMessages ? (
              // EMPTY STATE
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-center items-center px-4 overflow-y-auto no-scrollbar"
              >
                <div className="w-full max-w-xl flex flex-col items-center gap-6 py-8">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <MessageSquare className="size-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground mt-2">
                      Como posso ajudar hoje?
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                      Tire dúvidas conceituais, pesquise anotações, analise PDFs ou organize e gerencie seu progresso de tarefas.
                    </p>
                  </motion.div>

                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full"
                  >
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.title}
                        onClick={() => handleSend(s.prompt)}
                        className="item text-left p-3 flex flex-col justify-between gap-2 border border-border/40 bg-card/50 hover:bg-muted/10 transition-all duration-200 cursor-pointer min-h-[80px] rounded-xl"
                      >
                        <span className="text-lg">{s.icon}</span>
                        <div>
                          <div className="text-xs font-semibold text-foreground">{s.title}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">
                            {s.prompt}
                          </div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                  <div className="h-10" />
                </div>
              </motion.div>
            ) : (
              // MESSAGES LIST
              <motion.div
                key="messages-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar"
              >
                {isLoadingMessages ? (
                  <div className="text-xs text-muted-foreground text-center py-10">Carregando conversa...</div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === "user";
                    const isOptimistic = msg.id.startsWith("optimistic_");
                    const isPlaceholder = msg.id.startsWith("msg_placeholder_");
                    
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex w-full items-start gap-3",
                          isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isUser && (
                          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 mt-0.5">
                            <Sparkles className="size-4 text-primary" />
                          </div>
                        )}
                        <div
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.tagName === "A") {
                              const href = target.getAttribute("href");
                              if (href) {
                                if (href.startsWith("calendar:")) {
                                  e.preventDefault();
                                  const calId = href.split(":")[1];
                                  useCalendarStore.getState().setSidebarOpen(true);
                                  const activeIds = useCalendarStore.getState().activeCalendarIds;
                                  if (!activeIds.includes(calId)) {
                                    useCalendarStore.getState().toggleCalendarFilter(calId);
                                  }
                                } else if (href.startsWith("/hub/")) {
                                  e.preventDefault();
                                  router.push(href);
                                }
                              }
                            }
                          }}
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-2.5 border text-foreground flex flex-col",
                            isUser
                              ? "bg-primary text-white border-primary/20 rounded-tr-none"
                              : "bg-muted/30 border-border/40 rounded-tl-none"
                          )}
                        >
                          <div className="break-words select-text">
                            {/* 2. "PENSANDO..." STATE */}
                            {!isUser && isGenerating && msg.content === "" ? (
                              <div className="flex items-center gap-2 text-muted-foreground italic text-xs py-1">
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span>Pensando...</span>
                              </div>
                            ) : (
                              renderMessageContent(msg.content)
                            )}
                            
                            {!isUser && isGenerating && msg.content !== "" && isPlaceholder && (
                              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/80 animate-pulse align-middle" />
                            )}
                          </div>

                          {/* 3. METRICS FOOTER FOR ASSISTANT MESSAGES */}
                          {!isUser && !isOptimistic && !isPlaceholder && msg.content !== "" && (msg.promptTokens || msg.cost || msg.precision) && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 pt-1 border-t border-border/20 text-[9px] text-muted-foreground/60 select-none">
                              {msg.promptTokens !== null && msg.candidatesTokens !== null && (
                                <span>
                                  ⚡ {((msg.promptTokens || 0) + (msg.candidatesTokens || 0))} tokens 
                                  <span className="opacity-50"> ({msg.promptTokens} in / {msg.candidatesTokens} out)</span>
                                </span>
                              )}
                              {msg.cost !== null && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span>${parseFloat(msg.cost || "0").toFixed(6)}</span>
                                </>
                              )}
                              {msg.precision !== null && (
                                <>
                                  <span className="opacity-40">•</span>
                                  <span className="text-blue-500/80 dark:text-blue-400/80 font-bold">
                                    🎯 Precisão RAG: {msg.precision}%
                                  </span>
                                </>
                              )}
                            </div>
                          )}

                          <div
                            className={cn(
                              "text-[9px] mt-1 opacity-50 text-right select-none",
                              isUser ? "text-white/80" : "text-muted-foreground"
                            )}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input container */}
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className={cn(
              "p-2 shrink-0 z-10 w-full flex justify-center bg-background",
              isSidebar 
                ? "bg-card border-t border-border/10 px-2 pb-3 pt-2" 
                : hasMessages && "border-t border-border/20"
            )}
          >
            <div className="w-full max-w-xl flex flex-col items-center relative">
              {/* Autocomplete Suggestions Popover */}
              {showMentionSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute bottom-[110%] left-0 right-0 max-h-48 overflow-y-auto bg-card/95 backdrop-blur-md border border-border/40 rounded-xl p-1.5 flex flex-col gap-0.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 custom-scrollbar select-none">
                  {filteredSuggestions.map((item, idx) => (
                    <button
                      key={item.id + idx}
                      type="button"
                      onClick={() => handleSelectMention(item)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors cursor-pointer",
                        idx === activeSuggestionIndex
                          ? "bg-primary/15 text-primary font-medium"
                          : "text-foreground hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{item.type === "calendar" ? "📅" : item.type === "task" ? "🎯" : "📝"}</span>
                        <span className="font-semibold truncate">{item.title}</span>
                      </div>
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider shrink-0 pl-3",
                        idx === activeSuggestionIndex ? "text-primary/80" : "text-muted-foreground"
                      )}>
                        {item.type === "calendar" ? "Agenda" : item.type === "task" ? "Tarefa" : "Nota"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Input wrapper card */}
              <motion.div 
                layout
                className={cn(
                  "w-full border border-border/40 transition-all duration-200 bg-card select-none shadow-xs",
                  isFocused && "border-primary/50 ring-2 ring-primary/10 shadow-md shadow-primary/5",
                  (hasMessages || selectedReferences.length > 0)
                    ? "rounded-2xl p-2 px-3 flex flex-col gap-2" 
                    : "rounded-full p-2.5 px-4 flex items-center gap-2"
                )}
              >
                {hasMessages || selectedReferences.length > 0 ? (
                  <>
                    {selectedReferences.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-1 pt-1 select-none border-b border-border/10 pb-2 w-full">
                        {selectedReferences.map((ref) => {
                          let Icon = FileText;
                          let colorClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                          
                          if (ref.type === "calendar") {
                            Icon = CalendarIcon;
                            colorClass = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
                          } else if (ref.type === "task") {
                            Icon = CheckCircle2;
                            colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                          }

                          return (
                            <div
                              key={ref.id}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all animate-in fade-in zoom-in-95 duration-150",
                                colorClass
                              )}
                            >
                              <Icon className="size-3 shrink-0" />
                              <span className="truncate max-w-[150px]">{ref.title}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedReferences(prev => prev.filter((r) => r.id !== ref.id))}
                                className="hover:bg-foreground/10 rounded-full p-0.5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                              >
                                <X className="size-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="w-full flex items-end gap-2">
                      <motion.button
                        layout
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGenerating}
                        className={cn(
                          "flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-all shrink-0 cursor-pointer disabled:opacity-40",
                          hasMessages ? "size-9" : "size-10"
                        )}
                        title="Anexar arquivo"
                      >
                        <Paperclip className="size-4" />
                      </motion.button>
                      
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleUploadSimulate}
                        accept=".txt,.pdf,.png,.jpg,.jpeg,.json"
                      />

                      <textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                          setIsFocused(false);
                          setTimeout(() => setShowMentionSuggestions(false), 200);
                        }}
                        disabled={isGenerating}
                        placeholder="@ para notas ou / para agendas..."
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none resize-none no-scrollbar text-sm placeholder:text-muted-foreground/60 text-foreground py-1.5 px-1 min-h-[24px] max-h-[120px] focus:ring-0 leading-relaxed"
                      />

                      <motion.button
                        layout
                        onClick={() => handleSend(inputValue)}
                        disabled={(!inputValue.trim() && selectedReferences.length === 0) || isGenerating}
                        className={cn(
                          "flex items-center justify-center text-white transition-all shrink-0 cursor-pointer rounded-full",
                          (inputValue.trim() || selectedReferences.length > 0) && !isGenerating
                            ? "bg-primary hover:bg-primary/95 scale-100"
                            : "bg-muted text-muted-foreground/40 scale-95 cursor-not-allowed",
                          hasMessages ? "size-9" : "size-10"
                        )}
                        title="Enviar"
                      >
                        <ArrowUp className="size-4" />
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.button
                      layout
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating}
                      className={cn(
                        "flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-all shrink-0 cursor-pointer disabled:opacity-40",
                        hasMessages ? "size-9" : "size-10"
                      )}
                      title="Anexar arquivo"
                    >
                      <Paperclip className="size-4" />
                    </motion.button>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleUploadSimulate}
                      accept=".txt,.pdf,.png,.jpg,.jpeg,.json"
                    />

                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => {
                        setIsFocused(false);
                        setTimeout(() => setShowMentionSuggestions(false), 200);
                      }}
                      disabled={isGenerating}
                      placeholder="@ para notas ou / para agendas..."
                      rows={1}
                      className="flex-1 bg-transparent border-none outline-none resize-none no-scrollbar text-sm placeholder:text-muted-foreground/60 text-foreground py-1.5 px-1 min-h-[24px] max-h-[120px] focus:ring-0 leading-relaxed"
                    />

                    <motion.button
                      layout
                      onClick={() => handleSend(inputValue)}
                      disabled={(!inputValue.trim() && selectedReferences.length === 0) || isGenerating}
                      className={cn(
                        "flex items-center justify-center text-white transition-all shrink-0 cursor-pointer rounded-full",
                        (inputValue.trim() || selectedReferences.length > 0) && !isGenerating
                          ? "bg-primary hover:bg-primary/95 scale-100"
                          : "bg-muted text-muted-foreground/40 scale-95 cursor-not-allowed",
                        hasMessages ? "size-9" : "size-10"
                      )}
                      title="Enviar"
                    >
                      <ArrowUp className="size-4" />
                    </motion.button>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
