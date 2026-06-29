"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { enqueueAllPendingNotesAction, processUserVectorizationQueueAction } from "@/modules/vector/vector.actions";
import { useTheme } from "next-themes";
import { useAppearanceStore, ThemeColor, ThemeMode } from "@/modules/appearance/appearance.store";
import { useCalendarStore } from "@/modules/calendar/calendar.store";
import { Calendar } from "@/modules/calendar/calendar.schema";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  CalendarDays,
  Settings2,
  Trash2,
  Plus,
  Sun,
  Moon,
  Monitor,
  Check,
  RefreshCw,
  Globe,
  BarChart3,
  HardDrive,
  Cpu,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
  Image as ImageIcon,
  FileSpreadsheet,
  Play,
  ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageStats {
  storageUsedBytes: number;
  storageLimitBytes: number;
  vectorizedItems: number;
  totalActiveNotes: number;
  notVectorizedItems: number;
  queuePending: number;
  queueErrors: number;
  maxPdfFileSizeMb: number;
  maxExcelFileSizeMb: number;
  maxImageFileSizeMb: number;
  maxEmbeddingTextChars: number;
  embeddingModel: string;
  embeddingDimensions: number;
  aiModel: string;
  ragTopResults: number;
  batchEmbedSize: number;
}

interface SettingsContainerProps {
  initialCalendars: Calendar[];
  usageStats: UsageStats;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const THEME_COLORS: { value: ThemeColor; label: string; bg: string }[] = [
  { value: "violet", label: "Violeta", bg: "bg-[#8b5cf6]" },
  { value: "rose", label: "Rosa", bg: "bg-[#f43f5e]" },
  { value: "indigo", label: "Índigo", bg: "bg-[#6366f1]" },
  { value: "yellow", label: "Amarelo", bg: "bg-[#eab308]" },
  { value: "green", label: "Verde", bg: "bg-[#22c55e]" },
];

const PRESET_CALENDAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-red-500",
  "bg-violet-500",
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function SettingsContainer({ initialCalendars, user, usageStats }: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<"geral" | "calendario" | "limites">("geral");
  const { setTheme } = useTheme();
  const { themeColor, setThemeColor, mode, setMode } = useAppearanceStore();
  const { calendars, addCalendar, removeCalendar, importCalendar, syncCalendar } = useCalendarStore();
  
  // Create Calendar Form State
  const [newCalendarName, setNewCalendarName] = useState("");
  const [selectedColor, setSelectedColor] = useState("bg-blue-500");
  const [sharedUrl, setSharedUrl] = useState("");
  const [activeFormTab, setActiveFormTab] = useState<"local" | "shared">("local");

  // Vectorization action states
  const [isEnqueueing, setIsEnqueueing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Seed/sync store with initial server data
    useCalendarStore.setState({ calendars: initialCalendars });
  }, [initialCalendars]);

  const handleEnqueueAll = async () => {
    setIsEnqueueing(true);
    const toastId = toast.loading("Analisando notas e atualizando fila...");
    try {
      const res = await enqueueAllPendingNotesAction({});
      if (res?.data?.success) {
        const { enqueued, skipped } = res.data;
        toast.success(
          `Fila atualizada! ${enqueued} nota(s) enfileirada(s), ${skipped} já estavam vetorizadas.`,
          { id: toastId, duration: 6000 }
        );
      } else {
        toast.error("Erro ao atualizar a fila de vetorização.", { id: toastId });
      }
    } catch {
      toast.error("Erro inesperado ao atualizar a fila.", { id: toastId });
    } finally {
      setIsEnqueueing(false);
    }
  };

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    const toastId = toast.loading("Processando fila com Gemini Embedding...");
    try {
      const res = await processUserVectorizationQueueAction({});
      if (res?.data?.success) {
        const { processed, errors } = res.data;
        if (processed === 0) {
          toast.info("Nenhum item pendente na fila para processar.", { id: toastId });
        } else if (errors > 0) {
          toast.warning(
            `Concluído com avisos: ${processed} vetorizadas, ${errors} com erro.`,
            { id: toastId, duration: 6000 }
          );
        } else {
          toast.success(
            `${processed} nota(s) vetorizada(s) com sucesso!`,
            { id: toastId, duration: 5000 }
          );
        }
      } else {
        toast.error("Erro ao processar a fila de vetorização.", { id: toastId });
      }
    } catch {
      toast.error("Erro inesperado ao processar a fila.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModeChange = (newMode: ThemeMode) => {
    setMode(newMode);
    setTheme(newMode);
  };

  const handleAddCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCalendarName.trim()) return;
    
    const success = await addCalendar(newCalendarName.trim(), selectedColor);
    if (success) {
      setNewCalendarName("");
    }
  };

  const handleImportCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedUrl.trim()) return;
    
    const success = await importCalendar(sharedUrl.trim(), selectedColor);
    if (success) {
      setSharedUrl("");
    }
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start w-full pb-16">
      {/* Tabs Sidebar Selector */}
      <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1.5 border-b md:border-b-0 md:border-r border-border/30 pb-4 md:pb-0 md:pr-4">
        <button
          onClick={() => setActiveTab("geral")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex-1 md:flex-none justify-center md:justify-start",
            activeTab === "geral"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Settings2 className="size-4" />
          Aparência & Perfil
        </button>
        <button
          onClick={() => setActiveTab("calendario")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex-1 md:flex-none justify-center md:justify-start",
            activeTab === "calendario"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <CalendarDays className="size-4" />
          Configurações de Calendário
        </button>
        <button
          onClick={() => setActiveTab("limites")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex-1 md:flex-none justify-center md:justify-start",
            activeTab === "limites"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <BarChart3 className="size-4" />
          Uso & Limites
        </button>
      </aside>

      {/* Tabs Content Panel */}
      <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === "limites" ? (
          <div className="space-y-6">
            {/* Storage Usage */}
            <div className="item p-5 space-y-4">
              <div className="flex items-center gap-2">
                <HardDrive className="size-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                  Armazenamento de Arquivos
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Usado</span>
                  <span className="text-xs font-bold tabular-nums">
                    {formatBytes(usageStats.storageUsedBytes)}
                    <span className="text-muted-foreground font-normal"> / {formatBytes(usageStats.storageLimitBytes)}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      usageStats.storageUsedBytes / usageStats.storageLimitBytes > 0.85
                        ? "bg-destructive"
                        : usageStats.storageUsedBytes / usageStats.storageLimitBytes > 0.65
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{
                      width: `${Math.min(100, (usageStats.storageUsedBytes / usageStats.storageLimitBytes) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  {((usageStats.storageUsedBytes / usageStats.storageLimitBytes) * 100).toFixed(1)}% utilizado de {formatBytes(usageStats.storageLimitBytes)} totais
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="size-3.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Limite por PDF</p>
                    <p className="text-xs font-bold text-foreground">{usageStats.maxPdfFileSizeMb} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <FileSpreadsheet className="size-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Limite por Planilha</p>
                    <p className="text-xs font-bold text-foreground">{usageStats.maxExcelFileSizeMb} MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <ImageIcon className="size-3.5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Limite por Imagem</p>
                    <p className="text-xs font-bold text-foreground">{usageStats.maxImageFileSizeMb} MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vectorization Stats */}
            <div className="item p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="size-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                    Vetorização Semântica (RAG)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnqueueAll}
                    disabled={isEnqueueing || isProcessing}
                    className="text-xs h-8 gap-1.5"
                  >
                    {isEnqueueing ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <ListOrdered className="size-3.5" />
                    )}
                    Atualizar Fila
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleProcessQueue}
                    disabled={isProcessing || isEnqueueing}
                    className="text-xs h-8 gap-1.5"
                  >
                    {isProcessing ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    Iniciar Fila
                  </Button>
                </div>
              </div>
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Progresso de vetorização</span>
                  <span className="text-[10px] font-bold tabular-nums">
                    {usageStats.vectorizedItems} / {usageStats.totalActiveNotes} notas
                  </span>
                </div>
                <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: usageStats.totalActiveNotes > 0
                        ? `${Math.min(100, (usageStats.vectorizedItems / usageStats.totalActiveNotes) * 100).toFixed(1)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">IA Ativa</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{usageStats.vectorizedItems}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Clock className="size-3.5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">IA Pendente</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{usageStats.notVectorizedItems}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Upload className="size-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Na Fila</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{usageStats.queuePending}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertCircle className="size-3.5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Erros</p>
                    <p className="text-lg font-bold text-foreground tabular-nums">{usageStats.queueErrors}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Texto máx. indexado (PDF/Excel)</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {(usageStats.maxEmbeddingTextChars / 1000).toFixed(0)}k chars
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Resultados RAG no chat</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">top {usageStats.ragTopResults}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Upload className="size-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Lote máx. por cron</span>
                  </div>
                  <span className="text-xs font-bold text-foreground">{usageStats.batchEmbedSize} itens</span>
                </div>
              </div>
            </div>

            {/* AI Model Info */}
            <div className="item p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                  Modelos de Inteligência Artificial
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Sparkles className="size-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assistente IA (Chat)</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{usageStats.aiModel}</p>
                  <p className="text-[10px] text-muted-foreground">Usado para responder perguntas, resumir notas e auxiliar com tarefas.</p>
                  <div className="flex gap-1 flex-wrap pt-1">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">RAG</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">Context Window</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">Streaming</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10">
                      <Cpu className="size-3 text-indigo-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Modelo de Embedding</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{usageStats.embeddingModel}</p>
                  <p className="text-[10px] text-muted-foreground">Converte o conteúdo das suas notas em vetores para busca semântica.</p>
                  <div className="flex gap-1 flex-wrap pt-1">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-bold">{usageStats.embeddingDimensions}D</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-bold">pgvector</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[9px] font-bold">Cosine Similarity</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "geral" ? (
          <div className="space-y-6">
            {/* User Profile item */}
            <div className="item p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Perfil do Usuário
              </h3>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                  {user.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{user.name}</h4>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                  <p className="text-xs text-muted-foreground/70">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Mode (Theme Mode) Selector */}
            <div className="item p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Tema do Sistema
              </h3>
              <div className="grid grid-cols-3 gap-2.5 max-w-md">
                {[
                  { value: "light" as ThemeMode, label: "Claro", icon: Sun },
                  { value: "dark" as ThemeMode, label: "Escuro", icon: Moon },
                  { value: "system" as ThemeMode, label: "Sistema", icon: Monitor },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = mode === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleModeChange(item.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer gap-1.5",
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                      <span className="text-[10px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Colors */}
            <div className="item p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Cor de Destaque (Accent Color)
              </h3>
              <div className="flex gap-3 flex-wrap">
                {THEME_COLORS.map((color) => {
                  const active = themeColor === color.value;
                  return (
                    <button
                      key={color.value}
                      onClick={() => setThemeColor(color.value)}
                      className={cn(
                        "size-9 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                        color.bg,
                        active ? "ring-4 ring-primary/20 scale-105" : "hover:scale-105"
                      )}
                      title={color.label}
                    >
                      {active && <Check className="size-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add/Import Calendar Form */}
            <div className="item p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Gerenciar Calendários
              </h3>
              
              <div className="flex gap-2 border-b border-border/10 pb-3">
                <button
                  type="button"
                  onClick={() => setActiveFormTab("local")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    activeFormTab === "local"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  Criar Local
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab("shared")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    activeFormTab === "shared"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  Importar Compartilhado (.ics)
                </button>
              </div>

              {activeFormTab === "local" ? (
                <form onSubmit={handleAddCalendar} className="space-y-4 max-w-xl">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Nome do Calendário
                    </label>
                    <input
                      type="text"
                      value={newCalendarName}
                      onChange={(e) => setNewCalendarName(e.target.value)}
                      placeholder="Ex: Estudos, Projetos, Família..."
                      className="input h-9 px-3 text-xs w-full focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Cor da Agenda
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_CALENDAR_COLORS.map((color) => {
                        const active = selectedColor === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                              "size-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
                              color,
                              active ? "ring-4 ring-primary/20 scale-105" : "hover:scale-105"
                            )}
                          >
                            {active && <Check className="size-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!newCalendarName.trim()}
                    className="w-full sm:w-auto text-xs font-semibold"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Criar Calendário
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleImportCalendar} className="space-y-4 max-w-xl">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Link do Calendário Compartilhado (.ics / webcal)
                    </label>
                    <input
                      type="url"
                      value={sharedUrl}
                      onChange={(e) => setSharedUrl(e.target.value)}
                      placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                      className="input h-9 px-3 text-xs w-full focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground">
                      Cor da Agenda
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_CALENDAR_COLORS.map((color) => {
                        const active = selectedColor === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                              "size-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
                              color,
                              active ? "ring-4 ring-primary/20 scale-105" : "hover:scale-105"
                            )}
                          >
                            {active && <Check className="size-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!sharedUrl.trim()}
                    className="w-full sm:w-auto text-xs font-semibold"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Importar Calendário
                  </Button>
                </form>
              )}
            </div>

            {/* List Calendars */}
            <div className="item p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                Meus Calendários
              </h3>
              
              {calendars.length === 0 ? (
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarDays className="size-5 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Nenhum calendário</EmptyTitle>
                    <EmptyDescription>
                      Você ainda não possui calendários extras configurados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {calendars.map((cal) => (
                    <div
                      key={cal.id}
                      className="item flex items-center justify-between p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("size-3 rounded-full shrink-0", cal.backgroundColor)} />
                        <div>
                          <h4 className="text-xs font-bold text-foreground truncate max-w-[150px]">
                            {cal.summary}
                          </h4>
                          <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                            {cal.sharedUrl ? (
                              <>
                                <Globe className="size-2.5 text-primary" />
                                Compartilhado (iCal)
                              </>
                            ) : (
                              "Agenda Local"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {cal.sharedUrl && (
                          <button
                            onClick={() => syncCalendar(cal.id)}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                            title="Sincronizar Eventos"
                          >
                            <RefreshCw className="size-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeCalendar(cal.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors cursor-pointer"
                          title="Excluir Calendário"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
