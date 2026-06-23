"use client";

import { useMemo, useState } from "react";
import { Folder, Note, Tag } from "@/modules/notes/notes.schema";
import { Header } from "@/components/layout/header";
import { TagChips } from "../../notes/_components/tag-chips";
import { FolderCard } from "../../notes/_components/folder-card";
import { NoteCard } from "../../notes/_components/note-card";
import { SelectionActionBar } from "../../notes/_components/selection-action-bar";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyResults } from "@/components/ui/empty";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { updateNoteAction, updateFolderAction } from "@/modules/notes/notes.actions";
import { useDevice } from "@/hooks/ui/use-device";
import { SearchBar } from "@/components/ui/search-bar";

interface ArchiveDashboardProps {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
}

export function ArchiveDashboard({
  notes,
  folders,
  tags,
}: ArchiveDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const { isMobile } = useDevice();

  // Bulk Selection States
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Filter folders and notes that are archived but not trashed
  const displayedFolders = useMemo(() => {
    return folders.filter((f) => f.archived && !f.trashed);
  }, [folders]);

  const displayedNotes = useMemo(() => {
    return notes.filter((n) => n.archived && !n.trashed);
  }, [notes]);

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

    try {
      // Move notes to trash
      for (const id of Array.from(selectedNoteIds)) {
        await updateNoteAction({ id, updates: { trashed: true, archived: false } });
      }
      // Move folders to trash
      for (const id of Array.from(selectedFolderIds)) {
        await updateFolderAction({ id, updates: { trashed: true, archived: false } });
      }

      toast.success("Itens enviados para a lixeira!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao mover alguns itens para a lixeira.", { id: toastId });
    }
  };

  const handleBulkUnarchive = async () => {
    const totalCount = selectedNoteIds.size + selectedFolderIds.size;
    const toastId = toast.loading(`Desarquivando ${totalCount} itens...`);

    try {
      // Unarchive notes
      for (const id of Array.from(selectedNoteIds)) {
        await updateNoteAction({ id, updates: { archived: false } });
      }
      // Unarchive folders
      for (const id of Array.from(selectedFolderIds)) {
        await updateFolderAction({ id, updates: { archived: false } });
      }

      toast.success("Itens desarquivados com sucesso!", { id: toastId });
      handleClearSelection();
    } catch {
      toast.error("Erro ao desarquivar alguns itens.", { id: toastId });
    }
  };

  const hasItems = queryFilteredFolders.length > 0 || queryFilteredNotes.length > 0;

  return (
    <div>
      <Header
        title="Notas Arquivadas"
        className="contents"
        onSearchChange={isMobile ? setSearchQuery : undefined}
        showSubHeader={false}
      />

      <main className="container flex-1 py-6 flex flex-col gap-6">
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
              placeholder="Buscar no arquivo..."
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
                    <Archive className="size-6 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>Arquivo vazio</EmptyTitle>
                  <EmptyDescription>
                    Nenhum item arquivado encontrado. Você pode arquivar notas ou pastas no painel principal para mantê-las organizadas.
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
                    Pastas Arquivadas ({queryFilteredFolders.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {queryFilteredFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        mode="archive"
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
                    Notas Arquivadas ({queryFilteredNotes.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {queryFilteredNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        mode="archive"
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
        onArchive={handleBulkUnarchive}
        mode="archive"
      />
    </div>
  );
}
