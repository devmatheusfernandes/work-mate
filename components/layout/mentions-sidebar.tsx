"use client";

import { useEffect, useState } from "react";
import { useMentionsStore } from "@/modules/notes/mentions.store";
import { getNoteAction } from "@/modules/notes/notes.actions";
import { Note } from "@/modules/notes/notes.schema";
import { useDevice } from "@/hooks/ui/use-device";
import { Vault, VaultContent, VaultTitle } from "@/components/ui/vault";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronRight, FileText, Loader2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MentionsSidebar() {
  const { isOpen, setIsOpen, selectedId } = useMentionsStore();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isMobile, isStandalone } = useDevice();
  const isMobileOrPwa = isMobile || isStandalone;

  useEffect(() => {
    async function fetchNote() {
      if (!selectedId) return;
      setIsLoading(true);
      const res = await getNoteAction({ id: selectedId });
      if (res?.data?.success && res.data.note) {
        setNote(res.data.note as Note);
      }
      setIsLoading(false);
    }
    if (isOpen && selectedId) {
      fetchNote();
    }
  }, [isOpen, selectedId]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setNote(null), 300);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="size-8 animate-spin mb-4" />
          <p className="text-sm">Carregando conteúdo...</p>
        </div>
      );
    }

    if (!note) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground text-center">
          <FileText className="size-12 opacity-20 mb-4" />
          <p className="text-sm">Nenhum conteúdo selecionado ou não encontrado.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border/30 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold truncate max-w-[200px]">{note.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center size-7 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            {isMobileOrPwa ? <X className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 prose prose-sm dark:prose-invert max-w-none">
          {note.type === "task" && (
            <div className="mb-4 p-3 rounded-lg border bg-muted/20 text-sm">
              <span className="font-semibold block mb-1">Status:</span>
              <span className="capitalize">{note.taskStatus?.replace("_", " ")}</span>
            </div>
          )}

          {note.content ? (
            <div dangerouslySetInnerHTML={{ __html: note.content as string }} />
          ) : note.type === "pdf" || note.type === "excel" ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/5 mt-4">
              <FileText className="size-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-center mb-4">Este é um arquivo ({note.type}).</p>
              {note.fileUrl && (
                <a href={note.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm font-medium">
                  Baixar Arquivo
                </a>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-center mt-10">Sem conteúdo.</p>
          )}
        </div>

        <div className="p-4 border-t border-border/30 shrink-0">
          <Link href={`/hub/notes/${note.id}`} onClick={handleClose}>
            <Button className="w-full">
              Abrir Nota Completa
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  if (isMobileOrPwa) {
    return (
      <Vault open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <VaultContent aria-label="Visualização de menção" noPadding className="h-[85vh] max-h-[85vh]">
          <VaultTitle className="sr-only">Visualização de menção</VaultTitle>
          <div className="h-full w-full overflow-hidden flex flex-col bg-card">
            {renderContent()}
          </div>
        </VaultContent>
      </Vault>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 400, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          className="relative h-full overflow-hidden shrink-0 z-40"
        >
          <div className="h-full w-full pl-[2px] py-2 pr-2">
            <div className="h-full w-[390px] bg-card rounded-xl overflow-hidden flex flex-col relative border border-border/20 shadow-sm">
              {renderContent()}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
