"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileAudio,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/modules/chat/chat.store";
import { Vault, VaultContent, VaultTitle } from "@/components/ui/vault";
import { Button } from "@/components/ui/button";

interface PendingAudioRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  timestamp: number;
}

// Open the share-target IndexedDB written by the Service Worker
function openShareTargetDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("share-target-db", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pendingAudio")) {
        db.createObjectStore("pendingAudio", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingAudio(): Promise<PendingAudioRecord | null> {
  try {
    const db = await openShareTargetDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pendingAudio", "readonly");
      const req = tx.objectStore("pendingAudio").get("latest");
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function clearPendingAudio(): Promise<void> {
  try {
    const db = await openShareTargetDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("pendingAudio", "readwrite");
      tx.objectStore("pendingAudio").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

export function ShareTargetHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sessions, isLoadingSessions, loadSessions, sendAudioMessage, createNewSession } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedMode, setSelectedMode] = useState<"transcribe" | "summarize" | "both">("both");

  const hasIncomingAudio = searchParams.get("incoming-audio") === "1";

  useEffect(() => {
    let isMounted = true;

    const fetchAudio = async () => {
      const record = await getPendingAudio();
      if (!isMounted) return;

      if (!record) {
        toast.error("Nenhum áudio encontrado para processar.");
        return;
      }

      // Reconstruct a File from the ArrayBuffer stored in IndexedDB
      const blob = new Blob([record.data], { type: record.type || "audio/ogg" });
      const file = new File([blob], record.name || "audio_compartilhado.opus", {
        type: record.type || "audio/ogg",
      });

      setSharedFile(file);
      await loadSessions("active");
      
      if (isMounted) {
        setIsOpen(true);
      }
    };

    if (hasIncomingAudio) {
      fetchAudio();
    }

    return () => {
      isMounted = false;
    };
  }, [hasIncomingAudio, loadSessions]);

  const handleClose = () => {
    setIsOpen(false);
    setSharedFile(null);
    setSelectedSessionId(null);
    // Remove the incoming-audio query param from the URL
    router.replace("/hub/chat", { scroll: false });
    clearPendingAudio();
  };

  const handleSend = async () => {
    if (!sharedFile) return;
    setIsSending(true);

    try {
      let targetSessionId = selectedSessionId;
      if (!targetSessionId) {
        // Create a new session
        const newId = await createNewSession();
        if (!newId) {
          toast.error("Não foi possível criar uma nova conversa.");
          setIsSending(false);
          return;
        }
        targetSessionId = newId;
      }

      await sendAudioMessage(sharedFile, selectedMode, targetSessionId);
      toast.success("Áudio enviado para o chat!");
    } catch {
      toast.error("Erro ao processar o áudio compartilhado.");
    } finally {
      setIsSending(false);
      handleClose();
    }
  };

  if (!hasIncomingAudio) return null;

  return (
    <Vault open={isOpen} onOpenChange={(open) => { if (!open && !isSending) handleClose(); }}>
      <VaultContent
        aria-label="Áudio compartilhado"
        className="max-w-md w-full"
      >
        <VaultTitle className="sr-only">Áudio recebido — escolha o destino</VaultTitle>

        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                <FileAudio className="size-5 text-violet-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Áudio recebido</h2>
                <p className="text-xs text-muted-foreground">
                  {sharedFile
                    ? `${sharedFile.name} · ${(sharedFile.size / 1024 / 1024).toFixed(2)}MB`
                    : "Carregando..."}
                </p>
              </div>
            </div>
            {!isSending && (
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted p-1 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Mode selection */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O que fazer com o áudio?</p>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: "both" as const, label: "Transcrever e resumir", icon: <Sparkles className="size-3.5" />, desc: "Texto completo + pontos principais" },
                { id: "transcribe" as const, label: "Só transcrever", icon: <MessageSquare className="size-3.5" />, desc: "Apenas o texto literal do áudio" },
                { id: "summarize" as const, label: "Só resumir", icon: <FileAudio className="size-3.5" />, desc: "Apenas os pontos-chave" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedMode(opt.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    selectedMode === opt.id
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border/40 hover:bg-muted/50 text-foreground"
                  )}
                >
                  <div className={cn(
                    "size-7 rounded-lg flex items-center justify-center shrink-0",
                    selectedMode === opt.id ? "bg-primary/15" : "bg-muted"
                  )}>
                    {opt.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                  </div>
                  {selectedMode === opt.id && (
                    <div className="ml-auto size-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <div className="size-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Session selection */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviar para qual conversa?</p>

            {/* New session option */}
            <button
              onClick={() => setSelectedSessionId(null)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                selectedSessionId === null
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border/40 hover:bg-muted/50 text-foreground"
              )}
            >
              <div className={cn(
                "size-7 rounded-lg flex items-center justify-center shrink-0",
                selectedSessionId === null ? "bg-primary/15" : "bg-muted"
              )}>
                <Plus className="size-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold">Nova conversa</div>
                <div className="text-[10px] text-muted-foreground">Cria uma nova sessão de chat</div>
              </div>
              {selectedSessionId === null && (
                <div className="ml-auto size-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <div className="size-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>

            {/* Existing sessions */}
            {isLoadingSessions ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> Carregando conversas...
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-40 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {sessions.filter(s => !s.isArchived).slice(0, 10).map((session) => (
                    <motion.button
                      key={session.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        selectedSessionId === session.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "border-border/40 hover:bg-muted/50 text-foreground"
                      )}
                    >
                      <div className={cn(
                        "size-7 rounded-lg flex items-center justify-center shrink-0",
                        selectedSessionId === session.id ? "bg-primary/15" : "bg-muted"
                      )}>
                        <MessageSquare className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{session.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(session.updatedAt).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      {selectedSessionId === session.id && (
                        <div className="ml-auto size-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <div className="size-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isSending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !sharedFile}
              className="flex-1 gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Enviar áudio
                </>
              )}
            </Button>
          </div>
        </div>
      </VaultContent>
    </Vault>
  );
}
