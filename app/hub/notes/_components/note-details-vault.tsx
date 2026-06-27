"use client";

import { useEffect, useRef, useState } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { Note } from "@/modules/notes/notes.schema";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { saveOfflineItem } from "@/lib/offline-db";
import {
  Vault,
  VaultContent,
  VaultBody,
} from "@/components/ui/vault";

interface NoteDetailsVaultProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteUpdated?: (note: Note) => void;
}

export function NoteDetailsVault({
  note,
  open,
  onOpenChange,
  onNoteUpdated,
}: NoteDetailsVaultProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "saved_offline">("saved");
  const [noteTitle, setNoteTitle] = useState(note ? note.title : "");
  const [noteContent, setNoteContent] = useState(note ? note.content || "" : "");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [localTagIds, setLocalTagIds] = useState<string[]>(note ? note.tagIds || [] : []);
  const [prevNoteId, setPrevNoteId] = useState<string | null>(note ? note.id : null);
  const prevNoteIdRef = useRef<string | null>(note ? note.id : null);

  if (note && note.id !== prevNoteId) {
    const isIdSwap = prevNoteId && prevNoteId.startsWith("temp_") && !note.id.startsWith("temp_");
    setPrevNoteId(note.id);
    if (!isIdSwap) {
      setNoteTitle(note.title);
      setNoteContent(note.content || "");
      setLocalTagIds(note.tagIds || []);
      setSaveStatus("saved");
    } else {
      const hasEdits = noteTitle !== note.title || 
                       noteContent !== (note.content || "") || 
                       JSON.stringify(localTagIds) !== JSON.stringify(note.tagIds);
      setSaveStatus(hasEdits ? "saving" : "saved");
    }
  }

  useEffect(() => {
    if (!note) return;

    const wasTemp = prevNoteIdRef.current && prevNoteIdRef.current.startsWith("temp_");
    const isReal = !note.id.startsWith("temp_");
    
    if (wasTemp && isReal && note.id !== prevNoteIdRef.current) {
      const currentEdits: Partial<Note> = {};
      if (noteTitle !== note.title) currentEdits.title = noteTitle;
      if (noteContent !== (note.content || "")) currentEdits.content = noteContent;
      if (JSON.stringify(localTagIds) !== JSON.stringify(note.tagIds)) currentEdits.tagIds = localTagIds;
      
      if (Object.keys(currentEdits).length > 0) {
        updateNoteAction({ id: note.id, updates: currentEdits }).then((res) => {
          if (res?.data?.success) {
            setSaveStatus("saved");
            const updatedNote = { ...note, ...currentEdits } as Note;
            saveOfflineItem("notes", updatedNote);
            onNoteUpdated?.(updatedNote);
          } else {
            setSaveStatus("error");
          }
        }).catch(() => {
          setSaveStatus("error");
        });
      }
    }
    prevNoteIdRef.current = note.id;
  }, [note, noteTitle, noteContent, localTagIds, onNoteUpdated]);

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

    if (note.id.startsWith("temp_")) {
      return; // Hold edits in local state
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
    <Vault open={open} onOpenChange={onOpenChange} >
      <VaultContent showHandle={false} noPadding className="max-w-4xl h-[90vh] md:h-[85vh] overflow-hidden" aria-label="Editar Nota">
        <VaultBody className="p-0 h-full overflow-hidden relative">
          <div className="w-full h-full overflow-y-auto">
            <SimpleEditor
              title={noteTitle}
              content={noteContent}
              noteId={note.id}
              onChange={handleContentChange}
              onTitleChange={handleTitleChange}
            />
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
