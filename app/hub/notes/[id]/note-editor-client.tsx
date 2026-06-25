"use client";

import { useEffect, useRef, useState } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { updateNoteAction } from "@/modules/notes/notes.actions";
import { Note } from "@/modules/notes/notes.schema";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { saveOfflineItem } from "@/lib/offline-db";

interface NoteEditorClientProps {
  note: Note;
}

export function NoteEditorClient({ note }: NoteEditorClientProps) {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "saved_offline">("saved");
  const [noteTitle, setNoteTitle] = useState(note.title);
  const [noteContent, setNoteContent] = useState(note.content || "");
  const [prevNote, setPrevNote] = useState(note);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state during render if note changes externally (e.g. user switched notes)
  if (note.id !== prevNote.id) {
    setNoteTitle(note.title);
    setNoteContent(note.content || "");
    setPrevNote(note);
  } else if (note.updatedAt !== prevNote.updatedAt) {
    // Keep prevNote in sync with the server prop to avoid infinite checks,
    // but do NOT overwrite the local editor state if the note is the same.
    setPrevNote(note);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const triggerSave = (updates: Partial<Note>) => {
    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const isOffline = typeof window !== "undefined" && !window.navigator.onLine;
      const updatedNote = { ...note, ...updates } as Note;

      if (isOffline) {
        await saveOfflineItem("notes", updatedNote);
        await saveOfflineItem("syncQueue", {
          id: `op_${note.id}_${Date.now()}`,
          actionName: "updateNote",
          payload: { id: note.id, updates },
          timestamp: Date.now(),
        });
        setSaveStatus("saved_offline");
        return;
      }

      try {
        const res = await updateNoteAction({ id: note.id, updates });
        if (res?.data?.success) {
          setSaveStatus("saved");
          await saveOfflineItem("notes", res.data.note || updatedNote);
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
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-background">
      <SimpleEditor
        title={noteTitle}
        content={noteContent}
        onChange={handleContentChange}
        onTitleChange={handleTitleChange}
      />

      {/* Premium floating synchronization status indicator */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3.5 py-2 text-xs font-semibold shadow-xl backdrop-blur-md z-[100] animate-in fade-in slide-in-from-bottom-2 duration-300">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-muted-foreground">Salvando nota...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">Nota sincronizada</span>
          </>
        )}
        {saveStatus === "saved_offline" && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-500">Salvo localmente (offline)</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive">Erro ao salvar alteração</span>
          </>
        )}
      </div>
    </div>
  );
}
