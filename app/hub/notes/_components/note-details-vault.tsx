"use client";

import { useEffect, useRef, useState } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { Note, Tag } from "@/modules/notes/notes.schema";
import { NoteTagManager } from "./note-tag-manager";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { saveOfflineItem } from "@/lib/offline-db";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultBody,
} from "@/components/ui/vault";

interface NoteDetailsVaultProps {
  note: Note | null;
  tags?: Tag[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteUpdated?: (note: Note) => void;
}

export function NoteDetailsVault({
  note,
  tags = [],
  open,
  onOpenChange,
  onNoteUpdated,
}: NoteDetailsVaultProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "saved_offline">("saved");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [localTagIds, setLocalTagIds] = useState<string[]>([]);
  const [prevNote, setPrevNote] = useState<Note | null>(null);

  if (note !== prevNote) {
    setPrevNote(note);
    setNoteTitle(note ? note.title : "");
    setNoteContent(note ? note.content || "" : "");
    setLocalTagIds(note ? note.tagIds : []);
    setSaveStatus("saved");
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!note) return null;

  const triggerSave = (updates: Partial<Note>) => {
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
      const updatedNote = { ...note, ...updates } as Note;

      if (isOffline) {
        // Save to IndexedDB
        await saveOfflineItem("notes", updatedNote);
        // Save to sync queue
        const syncOp = {
          id: `op_${note.id}_${Date.now()}`,
          actionName: "updateNote",
          payload: { id: note.id, updates },
          timestamp: Date.now(),
        };
        await saveOfflineItem("syncQueue", syncOp);
        
        setSaveStatus("saved_offline");
        onNoteUpdated?.(updatedNote);
        return;
      }

      try {
        const res = await updateNoteAction({ id: note.id, updates });
        if (res?.data?.success) {
          setSaveStatus("saved");
          await saveOfflineItem("notes", updatedNote);
          onNoteUpdated?.(updatedNote);
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error(err);
        setSaveStatus("error");
      }
    }, 1200);
  };

  const handleContentChange = (htmlContent: string) => {
    setNoteContent(htmlContent);
    triggerSave({ content: htmlContent });
  };

  const handleTitleChange = (newTitle: string) => {
    setNoteTitle(newTitle);
    triggerSave({ title: newTitle });
  };

  return (
    <Vault open={open} onOpenChange={onOpenChange}>
      <VaultContent className="max-w-4xl h-[90vh] md:h-[85vh] p-0" aria-label="Editar Nota">
        <VaultHeader className="sr-only">
          <VaultTitle>Editar Nota</VaultTitle>
        </VaultHeader>
        <VaultBody className="p-0 h-full overflow-hidden relative">
          <div className="w-full h-full pt-4 pb-12 overflow-y-auto">
            <SimpleEditor
              title={noteTitle}
              content={noteContent}
              onChange={handleContentChange}
              onTitleChange={handleTitleChange}
            >
              <NoteTagManager
                noteTagIds={localTagIds}
                allTags={tags}
                onToggleTag={(tagId) => {
                  const nextTagIds = localTagIds.includes(tagId)
                    ? localTagIds.filter((id) => id !== tagId)
                    : [...localTagIds, tagId];
                  setLocalTagIds(nextTagIds);
                  triggerSave({ tagIds: nextTagIds });
                }}
              />
            </SimpleEditor>
          </div>

          {/* Synchronization status indicator */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-md z-[100]">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span className="text-muted-foreground">Salvando...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-muted-foreground">Sincronizada</span>
              </>
            )}
            {saveStatus === "saved_offline" && (
              <>
                <CheckCircle2 className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500">Salvo offline</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Erro ao salvar</span>
              </>
            )}
          </div>
        </VaultBody>
      </VaultContent>
    </Vault>
  );
}
