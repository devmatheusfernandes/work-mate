"use client";

import { useMemo, useState } from "react";
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
import { deleteNoteAction, deleteFolderAction, updateNoteAction, updateFolderAction } from "@/modules/notes/notes.actions";
import { useDevice } from "@/hooks/ui/use-device";
import { SearchBar } from "@/components/ui/search-bar";

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
  const { isMobile } = useDevice();

  // Bulk Selection States
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Derive current folder details
  const currentFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return folders.find((f) => f.id === activeFolderId) ?? null;
  }, [folders, activeFolderId]);

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
    return notes.filter((n) => n.type === "task" && !n.archived && !n.trashed);
  }, [notes]);

  // Filter folders and notes inside active folder (exclude tasks)
  const displayedFolders = useMemo(() => {
    return folders.filter(
      (f) => f.parentId === activeFolderId && !f.archived && !f.trashed
    );
  }, [folders, activeFolderId]);

  const displayedNotes = useMemo(() => {
    return notes.filter(
      (n) =>
        n.folderId === activeFolderId &&
        !n.archived &&
        !n.trashed &&
        n.type !== "task"
    );
  }, [notes, activeFolderId]);

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
    const toastId = toast.loading(`Excluindo ${totalCount} itens...`);

    try {
      // Delete selected notes
      for (const id of Array.from(selectedNoteIds)) {
        await deleteNoteAction({ id });
      }
      // Delete selected folders
      for (const id of Array.from(selectedFolderIds)) {
        await deleteFolderAction({ id });
      }

      toast.success("Itens excluídos com sucesso!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao excluir alguns itens.", { id: toastId });
    }
  };

  const handleBulkArchive = async () => {
    const totalCount = selectedNoteIds.size + selectedFolderIds.size;
    const toastId = toast.loading(`Arquivando ${totalCount} itens...`);

    try {
      // Archive notes
      for (const id of Array.from(selectedNoteIds)) {
        await updateNoteAction({ id, updates: { archived: true } });
      }
      // Archive folders
      for (const id of Array.from(selectedFolderIds)) {
        await updateFolderAction({ id, updates: { archived: true } });
      }

      toast.success("Itens arquivados!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao arquivar alguns itens.", { id: toastId });
    }
  };

  // Handle drop on main grid area (task → note conversion)
  const handleGridDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;

    const [type, id] = data.split(":");
    if (type !== "task" || !id) return;

    const toastId = toast.loading("Convertendo tarefa em nota...");
    try {
      const result = await updateNoteAction({
        id,
        updates: {
          type: "note",
          taskStatus: null,
          taskDeadline: null,
          taskSubtasks: [],
          taskShouldNotify: false,
          folderId: activeFolderId,
        },
      });
      if (result?.data?.success) {
        toast.success("Tarefa convertida em nota!", { id: toastId });
      } else {
        toast.error("Erro ao converter.", { id: toastId });
      }
    } catch {
      toast.error("Erro ao converter.", { id: toastId });
    }
  };

  const hasItems = queryFilteredFolders.length > 0 || queryFilteredNotes.length > 0;

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
    <div className="flex h-full min-h-screen">
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleGridDrop}
        >
          {/* Tags & Search Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            <div className="flex-1 min-w-0">
              <TagChips
                tags={tags}
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
                {queryFilteredNotes.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Notas e Arquivos ({queryFilteredNotes.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {queryFilteredNotes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          searchQuery={searchQuery}
                          isSelected={selectedNoteIds.has(note.id)}
                          onToggleSelect={() => toggleSelectNote(note.id)}
                          isSelectionActive={isSelectionActive}
                        />
                      ))}
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
        />

        {/* Floating Create FAB */}
        <CreateButton activeFolderId={activeFolderId} tags={tags} />
      </div>

      {/* Tasks Sidebar (Desktop only) */}
      {!isMobile && (
        <TasksSidebar
          tasks={allTasks}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          onDragOverSidebar={() => {
            if (!sidebarOpen) setSidebarOpen(true);
          }}
        />
      )}
    </div>
  );
}
