"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Folder, Note, Tag } from "@/modules/notes/notes.schema";
import { Header, type HeaderAction } from "@/components/layout/header";
import { TagChips } from "./tag-chips";
import { FolderCard } from "./folder-card";
import { NoteCard } from "./note-card";
import { SelectionActionBar } from "./selection-action-bar";
import { CreateButton } from "./create-button";
import { TasksSidebar } from "./tasks-sidebar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyResults } from "@/components/ui/empty";
import { FileText, KanbanSquare } from "lucide-react";
import { toast } from "sonner";
import { updateNoteAction, updateFolderAction, embedMultipleNotesNowAction } from "@/modules/notes/notes.actions";
import { useDevice } from "@/hooks/ui/use-device";
import { SearchBar } from "@/components/ui/search-bar";
import { saveOfflineItem, getAllOfflineItems, saveOfflineItemsBatch } from "@/lib/offline-db";
import { NoteDetailsVault } from "./note-details-vault";

interface NotesDashboardProps {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  activeFolderId: string | null;
}

export function NotesDashboard({
  notes,
  folders,
  tags,
  activeFolderId,
}: NotesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasksSidebarExpanded, setTasksSidebarExpanded] = useState(false);
  const { isMobile } = useDevice();

  const [localNotes, setLocalNotes] = useState(notes);
  const [localFolders, setLocalFolders] = useState(folders);
  const [localTags, setLocalTags] = useState(tags);
  const [prevNotes, setPrevNotes] = useState(notes);
  const [isDragOverGrid, setIsDragOverGrid] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteVaultOpen, setNoteVaultOpen] = useState(false);

  if (notes !== prevNotes) {
    setLocalNotes(notes);
    setLocalFolders(folders);
    setLocalTags(tags);
    setPrevNotes(notes);
  }

  useEffect(() => {
    async function syncOfflineData() {
      if (typeof window !== "undefined") {
        if (window.navigator.onLine) {
          await saveOfflineItemsBatch("notes", notes);
          await saveOfflineItemsBatch("folders", folders);
          await saveOfflineItemsBatch("tags", tags);
        } else {
          const dbNotes = await getAllOfflineItems<Note>("notes");
          const dbFolders = await getAllOfflineItems<Folder>("folders");
          const dbTags = await getAllOfflineItems<Tag>("tags");
          if (dbNotes.length > 0) setLocalNotes(dbNotes);
          if (dbFolders.length > 0) setLocalFolders(dbFolders);
          if (dbTags.length > 0) setLocalTags(dbTags);
        }
      }
    }
    syncOfflineData();
  }, [notes, folders, tags]);

  // Bulk Selection States
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  const handleUpdateNoteOptimistic = useCallback(
    async (
      id: string,
      updates: Partial<Note>,
      apiCall: () => Promise<{ data?: { success?: boolean } } | undefined>
    ) => {
      const prev = [...localNotes];
      const updatedNote = localNotes.find((n) => n.id === id);
      const newNote = updatedNote ? ({ ...updatedNote, ...updates } as Note) : null;

      setLocalNotes((current) =>
        current.map((n) => (n.id === id ? ({ ...n, ...updates } as Note) : n))
      );

      if (typeof window !== "undefined" && !window.navigator.onLine) {
        if (newNote) {
          await saveOfflineItem("notes", newNote);
        }
        const syncOp = {
          id: `op_${id}_${Date.now()}`,
          actionName: "updateNote",
          payload: { id, updates },
          timestamp: Date.now(),
        };
        await saveOfflineItem("syncQueue", syncOp);
        toast.success("Alteração salva localmente (offline)");
        return;
      }

      try {
        const result = await apiCall();
        if (!result?.data?.success) {
          setLocalNotes(prev);
          toast.error("Erro ao sincronizar alteração.");
        } else if (newNote) {
          await saveOfflineItem("notes", newNote);
        }
      } catch (err) {
        console.error(err);
        setLocalNotes(prev);
        toast.error("Erro de conexão ao salvar alteração.");
      }
    },
    [localNotes]
  );

  // Derive current folder details
  const currentFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return localFolders.find((f) => f.id === activeFolderId) ?? null;
  }, [localFolders, activeFolderId]);

  // Back button href for sub-folders
  const backHref = useMemo(() => {
    if (!activeFolderId) return undefined;
    if (currentFolder?.parentId) {
      return `/hub/notes/folder/${currentFolder.parentId}`;
    }
    return "/hub/notes";
  }, [activeFolderId, currentFolder]);

  // Separate tasks from notes
  const allTasks = useMemo(() => {
    return localNotes.filter((n) => n.type === "task" && !n.archived && !n.trashed);
  }, [localNotes]);

  // Filter folders and notes inside active folder (exclude tasks)
  const displayedFolders = useMemo(() => {
    return localFolders.filter(
      (f) => f.parentId === activeFolderId && !f.archived && !f.trashed
    );
  }, [localFolders, activeFolderId]);

  const displayedNotes = useMemo(() => {
    return localNotes.filter(
      (n) =>
        n.folderId === activeFolderId &&
        !n.archived &&
        !n.trashed &&
        n.type !== "task"
    );
  }, [localNotes, activeFolderId]);

  // Filter notes by selected tag
  const tagFilteredNotes = useMemo(() => {
    if (!selectedTagId) return displayedNotes;
    return displayedNotes.filter((n) => n.tagIds.includes(selectedTagId));
  }, [displayedNotes, selectedTagId]);

  // Filter both lists by search query
  const queryFilteredFolders = useMemo(() => {
    if (!searchQuery.trim()) return displayedFolders;
    const q = searchQuery.toLowerCase();
    return displayedFolders.filter((f) => f.title.toLowerCase().includes(q));
  }, [displayedFolders, searchQuery]);

  const queryFilteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return tagFilteredNotes;
    const q = searchQuery.toLowerCase();
    return tagFilteredNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.searchText && n.searchText.toLowerCase().includes(q))
    );
  }, [tagFilteredNotes, searchQuery]);

  // Check if selection is active
  const isSelectionActive = selectedNoteIds.size > 0 || selectedFolderIds.size > 0;

  // Toggle selection functions
  const toggleSelectNote = (id: string) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectFolder = (id: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedNoteIds(new Set());
    setSelectedFolderIds(new Set());
  };

  // Bulk Mutators
  const handleBulkDelete = async () => {
    const totalCount = selectedNoteIds.size + selectedFolderIds.size;
    const toastId = toast.loading(`Enviando ${totalCount} itens para a lixeira...`);
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    try {
      // Move selected notes to trash
      for (const id of Array.from(selectedNoteIds)) {
        if (isOffline) {
          const n = localNotes.find((item) => item.id === id);
          if (n) {
            const updated = { ...n, trashed: true, archived: false } as Note;
            await saveOfflineItem("notes", updated);
            setLocalNotes((curr) => curr.map((item) => (item.id === id ? updated : item)));
            await saveOfflineItem("syncQueue", {
              id: `op_${id}_${Date.now()}`,
              actionName: "updateNote",
              payload: { id, updates: { trashed: true, archived: false } },
              timestamp: Date.now(),
            });
          }
        } else {
          await updateNoteAction({ id, updates: { trashed: true, archived: false } });
        }
      }
      // Move selected folders to trash
      for (const id of Array.from(selectedFolderIds)) {
        if (isOffline) {
          const f = localFolders.find((item) => item.id === id);
          if (f) {
            const updated = { ...f, trashed: true, archived: false } as Folder;
            await saveOfflineItem("folders", updated);
            setLocalFolders((curr) => curr.map((item) => (item.id === id ? updated : item)));
            await saveOfflineItem("syncQueue", {
              id: `op_${id}_${Date.now()}`,
              actionName: "updateFolder",
              payload: { id, updates: { trashed: true, archived: false } },
              timestamp: Date.now(),
            });
          }
        } else {
          await updateFolderAction({ id, updates: { trashed: true, archived: false } });
        }
      }

      toast.success(isOffline ? "Itens enviados para a lixeira offline!" : "Itens enviados para a lixeira!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao enviar alguns itens para a lixeira.", { id: toastId });
    }
  };

  const handleBulkArchive = async () => {
    const totalCount = selectedNoteIds.size + selectedFolderIds.size;
    const toastId = toast.loading(`Arquivando ${totalCount} itens...`);
    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    try {
      // Archive notes
      for (const id of Array.from(selectedNoteIds)) {
        if (isOffline) {
          const n = localNotes.find((item) => item.id === id);
          if (n) {
            const updated = { ...n, archived: true } as Note;
            await saveOfflineItem("notes", updated);
            setLocalNotes((curr) => curr.map((item) => (item.id === id ? updated : item)));
            await saveOfflineItem("syncQueue", {
              id: `op_${id}_${Date.now()}`,
              actionName: "updateNote",
              payload: { id, updates: { archived: true } },
              timestamp: Date.now(),
            });
          }
        } else {
          await updateNoteAction({ id, updates: { archived: true } });
        }
      }
      // Archive folders
      for (const id of Array.from(selectedFolderIds)) {
        if (isOffline) {
          const f = localFolders.find((item) => item.id === id);
          if (f) {
            const updated = { ...f, archived: true } as Folder;
            await saveOfflineItem("folders", updated);
            setLocalFolders((curr) => curr.map((item) => (item.id === id ? updated : item)));
            await saveOfflineItem("syncQueue", {
              id: `op_${id}_${Date.now()}`,
              actionName: "updateFolder",
              payload: { id, updates: { archived: true } },
              timestamp: Date.now(),
            });
          }
        } else {
          await updateFolderAction({ id, updates: { archived: true } });
        }
      }

      toast.success(isOffline ? "Itens arquivados offline!" : "Itens arquivados!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao arquivar alguns itens.", { id: toastId });
    }
  };

  const handleBulkEmbed = async () => {
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      toast.error("Vetorização com IA requer conexão com a internet.");
      return;
    }

    const totalCount = selectedNoteIds.size;
    if (totalCount === 0) return;

    const toastId = toast.loading(`Vetorizando ${totalCount} nota(s) com Gemini...`);

    try {
      const res = await embedMultipleNotesNowAction({ ids: Array.from(selectedNoteIds) });
      if (res?.data?.success) {
        toast.success("Notas vetorizadas com sucesso!", { id: toastId });
        handleClearSelection();
      } else {
        toast.error(res?.data?.error || "Erro ao vetorizar notas.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao vetorizar notas.", { id: toastId });
    }
  };

  // Handle drop on main grid area (task → note conversion)
  const handleGridDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const [type, id] = data.split(":");
    if (type !== "task" || !id) return;

    handleUpdateNoteOptimistic(
      id,
      {
        type: "note",
        taskStatus: null,
        taskDeadline: null,
        taskSubtasks: [],
        taskShouldNotify: false,
        folderId: activeFolderId,
      },
      () =>
        updateNoteAction({
          id,
          updates: {
            type: "note",
            taskStatus: null,
            taskDeadline: null,
            taskSubtasks: [],
            taskShouldNotify: false,
            folderId: activeFolderId,
          },
        })
    );
  };

  const hasItems = queryFilteredFolders.length > 0 || queryFilteredNotes.length > 0 || isDragOverGrid;

  // Header actions — mobile Kanban button
  const headerActions: HeaderAction[] = isMobile
    ? [
        {
          icon: <KanbanSquare className="size-5" />,
          label: "Kanban",
          href: "/hub/tasks",
        },
      ]
    : [];

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 pb-24">
        {/* Header with Search integration */}
        <Header
          title={currentFolder ? currentFolder.title : "Notas"}
          className="contents"
          backHref={backHref}
          onSearchChange={isMobile ? setSearchQuery : undefined}
          showSubHeader={false}
          actions={headerActions}
        />

        <main
          className="container flex-1 py-6 flex flex-col gap-6"
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer.types.includes("text/plain")) {
              setIsDragOverGrid(true);
            }
          }}
          onDragLeave={() => setIsDragOverGrid(false)}
          onDrop={(e) => {
            setIsDragOverGrid(false);
            handleGridDrop(e);
          }}
        >
          {/* Tags & Search Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div className="flex-1 min-w-0">
              <TagChips
                tags={localTags}
                selectedTagId={selectedTagId}
                onSelectTag={setSelectedTagId}
              />
            </div>
            <div className="hidden md:block w-72 shrink-0">
              <SearchBar
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notas..."
              />
            </div>
          </div>

          {/* Dashboard Content Grid */}
          <div className="flex flex-col gap-6">
            {!hasItems ? (
              searchQuery ? (
                <EmptyResults searchQuery={searchQuery} />
              ) : (
                <Empty className="py-20 border-none bg-transparent">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FileText className="size-6 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>Nada por aqui ainda</EmptyTitle>
                    <EmptyDescription>
                      Esta pasta está vazia. Toque no botão + no canto inferior direito para começar a organizar seus estudos.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )
            ) : (
              <>
                {/* Folders Section */}
                {queryFilteredFolders.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Pastas ({queryFilteredFolders.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {queryFilteredFolders.map((folder) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          isSelected={selectedFolderIds.has(folder.id)}
                          onToggleSelect={() => toggleSelectFolder(folder.id)}
                          isSelectionActive={isSelectionActive}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {(queryFilteredNotes.length > 0 || isDragOverGrid) && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Notas e Arquivos ({queryFilteredNotes.length + (isDragOverGrid ? 1 : 0)})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {queryFilteredNotes.map((note) => (
                        <motion.div
                          key={note.id}
                          layout
                          transition={{ type: "spring", stiffness: 200, damping: 24 }}
                        >
                          <NoteCard
                            note={note}
                            searchQuery={searchQuery}
                            isSelected={selectedNoteIds.has(note.id)}
                            onToggleSelect={() => toggleSelectNote(note.id)}
                            isSelectionActive={isSelectionActive}
                            onOpenNote={(n) => {
                              setEditingNote(n);
                              setNoteVaultOpen(true);
                            }}
                          />
                        </motion.div>
                      ))}
                      {isDragOverGrid && (
                        <motion.div
                          key="grid-placeholder"
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 200, damping: 24 }}
                          className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 animate-pulse p-4 min-h-[160px] flex flex-col justify-center items-center text-primary/40 text-xs font-semibold"
                        >
                          <FileText className="size-6 mb-1.5 opacity-60" />
                          Solte para converter em Nota
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {/* Bulk Selection Floating Action Bar */}
        <SelectionActionBar
          selectedNoteIds={selectedNoteIds}
          selectedFolderIds={selectedFolderIds}
          onClear={handleClearSelection}
          onDelete={handleBulkDelete}
          onArchive={handleBulkArchive}
          onEmbed={handleBulkEmbed}
        />

        {/* Floating Create FAB */}
        <CreateButton 
          activeFolderId={activeFolderId} 
          tags={localTags} 
          isTasksSidebarOpen={sidebarOpen}
          isTasksSidebarExpanded={tasksSidebarExpanded}
          onOpenTasksSidebar={() => setSidebarOpen(true)}
          onNoteCreatedOffline={(newNote) => {
            setLocalNotes((curr) => [newNote, ...curr]);
            if (newNote.type === "note" || newNote.type === "pdf") {
              setEditingNote(newNote);
              setNoteVaultOpen(true);
            }
          }}
          onFolderCreatedOffline={(newFolder) => {
            setLocalFolders((curr) => [newFolder, ...curr]);
          }}
          onTagCreatedOffline={(newTag) => {
            setLocalTags((curr) => [newTag, ...curr]);
          }}
          onTagDeletedOffline={(tagId) => {
            setLocalTags((curr) => curr.filter((t) => t.id !== tagId));
          }}
        />
        <NoteDetailsVault
          note={editingNote}
          open={noteVaultOpen}
          onOpenChange={setNoteVaultOpen}
          onNoteUpdated={(updatedNote) => {
            setLocalNotes((curr) => curr.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
          }}
        />
      </div>

      {/* Tasks Sidebar */}
      <TasksSidebar
        tasks={allTasks}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onDragOverSidebar={() => {
          if (!sidebarOpen) setSidebarOpen(true);
        }}
        onUpdateNoteOptimistic={handleUpdateNoteOptimistic}
        onExpandedChange={setTasksSidebarExpanded}
      />
    </div>
  );
}
