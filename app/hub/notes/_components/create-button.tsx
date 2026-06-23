"use client";

import { useState, useRef, ChangeEvent, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderPlus, Tag as TagIcon, FilePlus, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import {
  createNoteAction,
  createFolderAction,
  createTagAction,
  deleteTagAction
} from "@/modules/notes/notes.actions";
import {
  Vault,
  VaultContent,
  VaultHeader,
  VaultTitle,
  VaultDescription,
  VaultBody,
  VaultFooter,
  VaultPrimaryButton,
  VaultSecondaryButton,
  VaultField,
  VaultInput,
} from "@/components/ui/vault";
import { Tag } from "@/modules/notes/notes.schema";

interface CreateButtonProps {
  activeFolderId: string | null;
  tags: Tag[];
}

const tagColors = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

// Menu items ordered bottom-to-top (first item appears closest to the FAB)
const menuItems = [
  {
    key: "note",
    label: "Nova Nota",
    gradient: "from-blue-500 to-indigo-500",
    Icon: FilePlus,
  },
  {
    key: "folder",
    label: "Nova Pasta",
    gradient: "from-violet-500 to-purple-500",
    Icon: FolderPlus,
  },
  {
    key: "tag",
    label: "Tags",
    gradient: "from-emerald-500 to-teal-500",
    Icon: TagIcon,
  },
  {
    key: "pdf",
    label: "Subir PDF",
    gradient: "from-orange-500 to-amber-500",
    Icon: FileText,
  },
] as const;

type MenuKey = typeof menuItems[number]["key"];

// Spring config for a snappy, physical feel
const springConfig = { type: "spring", stiffness: 400, damping: 28, mass: 0.8 } as const;

// Stagger container variants
const menuContainerVariants = {
  closed: {},
  open: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.02,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

// Individual item variants
const itemVariants = {
  closed: {
    opacity: 0,
    y: 16,
    scale: 0.88,
    filter: "blur(4px)",
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.92,
    filter: "blur(2px)",
    transition: { duration: 0.15, ease: "easeIn" as const },
  },
};

export function CreateButton({ activeFolderId, tags }: CreateButtonProps) {
  const router = useRouter();
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [activeVault, setActiveVault] = useState<"folder" | "tag" | null>(null);

  // States for folder Vault
  const [folderTitle, setFolderTitle] = useState("");
  const [folderColor, setFolderColor] = useState(tagColors[4]);
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false);

  // States for tag Vault
  const [newTagTitle, setNewTagTitle] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColors[0]);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  // Loading states
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const isMenuBusy = isCreatingNote || isUploadingPdf;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close floating menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Action handlers (Declared first so they are available in Pointer Handlers) ---
  const handleCreateNote = useCallback(async () => {
    setIsCreatingNote(true);
    setIsOpenMenu(false);
    const toastId = toast.loading("Criando nota...");

    try {
      const res = await createNoteAction({
        title: "Nova Nota",
        folderId: activeFolderId,
        type: "note",
      });

      if (res?.data?.success && res.data.note) {
        toast.success("Nota criada com sucesso!", { id: toastId });
        router.push(`/hub/notes/${res.data.note.id}`);
      } else {
        toast.error(res?.serverError || "Erro ao criar nota.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao criar nota.", { id: toastId });
    } finally {
      setIsCreatingNote(false);
    }
  }, [activeFolderId, router]);

  const handleCreateFolder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!folderTitle.trim()) return;

    setIsSubmittingFolder(true);
    const toastId = toast.loading("Criando pasta...");

    try {
      const res = await createFolderAction({
        title: folderTitle.trim(),
        parentId: activeFolderId,
        color: folderColor,
      });

      if (res?.data?.success) {
        toast.success("Pasta criada com sucesso!", { id: toastId });
        setFolderTitle("");
        setActiveVault(null);
      } else {
        toast.error(res?.serverError || "Erro ao criar pasta.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao criar pasta.", { id: toastId });
    } finally {
      setIsSubmittingFolder(false);
    }
  };

  const handleCreateTag = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTagTitle.trim()) return;

    setIsSubmittingTag(true);
    try {
      const res = await createTagAction({
        title: newTagTitle.trim(),
        color: newTagColor,
      });

      if (res?.data?.success) {
        toast.success("Tag criada com sucesso!");
        setNewTagTitle("");
      } else {
        toast.error(res?.serverError || "Erro ao criar tag.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar tag.");
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    setDeletingTagId(tagId);
    try {
      const res = await deleteTagAction({ id: tagId });
      if (res?.data?.success) {
        toast.success("Tag excluída.");
      } else {
        toast.error("Erro ao excluir tag.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir tag.");
    } finally {
      setDeletingTagId(null);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }

    setIsUploadingPdf(true);
    setIsOpenMenu(false);
    const toastId = toast.loading("Enviando PDF...");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileUrl = reader.result as string;
        const res = await createNoteAction({
          title: file.name.replace(/\.[^/.]+$/, ""),
          folderId: activeFolderId,
          type: "pdf",
          fileUrl,
        });

        if (res?.data?.success && res.data.note) {
          toast.success("PDF enviado com sucesso!", { id: toastId });
          router.push(`/hub/notes/${res.data.note.id}`);
        } else {
          toast.error("Erro ao enviar PDF.", { id: toastId });
        }
        setIsUploadingPdf(false);
      };
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo.", { id: toastId });
        setIsUploadingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao enviar PDF.", { id: toastId });
      setIsUploadingPdf(false);
    }
  };

  const handleMenuItemClick = (key: MenuKey) => {
    switch (key) {
      case "note":
        handleCreateNote();
        break;
      case "folder":
        setIsOpenMenu(false);
        setActiveVault("folder");
        break;
      case "tag":
        setIsOpenMenu(false);
        setActiveVault("tag");
        break;
      case "pdf":
        fileInputRef.current?.click();
        break;
    }
  };

  // --- Pointer & Long Press Handlers (Defined after action handlers to prevent hoisting issues) ---
  const [isPressing, setIsPressing] = useState(false);
  const pressProgress = useSpring(0, { stiffness: 80, damping: 20 });
  const fabScale = useTransform(pressProgress, [0, 1], [1, 0.88]);

  const LONG_PRESS_MS = 450;
  const MOVE_THRESHOLD_PX = 8;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);

  const cancelPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pointerStart.current = null;
    didLongPress.current = false;
    setIsPressing(false);
    pressProgress.set(0);
  }, [pressProgress]);

  const handleFabPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (isMenuBusy) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;

    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStart.current = { x: e.clientX, y: e.clientY };
    didLongPress.current = false;
    setIsPressing(true);
    pressProgress.set(0);

    pressProgress.set(1);

    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setIsPressing(false);
      setIsOpenMenu((prev) => !prev);
      pressProgress.set(0);
    }, LONG_PRESS_MS);
  }, [isMenuBusy, pressProgress]);

  const handleFabPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
      cancelPress();
    }
  }, [cancelPress]);

  const handleFabPointerUp = useCallback(() => {
    if (!pointerStart.current) return;
    const wasLongPress = didLongPress.current;
    cancelPress();
    if (!wasLongPress && !isMenuBusy) {
      if (isOpenMenu) {
        setIsOpenMenu(false);
      } else {
        handleCreateNote();
      }
    }
  }, [cancelPress, isMenuBusy, isOpenMenu, handleCreateNote]);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        className="hidden"
      />

      <div ref={menuRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Animated menu items */}
        <AnimatePresence>
          {isOpenMenu && (
            <motion.div
              className="flex flex-col gap-2 mb-2"
              variants={menuContainerVariants}
              initial="closed"
              animate="open"
              exit="exit"
            >
              {menuItems.map(({ key, label, gradient, Icon }) => (
                <motion.button
                  key={key}
                  variants={itemVariants}
                  onClick={() => handleMenuItemClick(key)}
                  disabled={isMenuBusy}
                  whileHover={{ x: -3, transition: { type: "spring", stiffness: 500, damping: 30 } }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted/80 transition-colors cursor-pointer text-right justify-end"
                >
                  <span>{label}</span>
                  <motion.div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full bg-linear-to-tr text-white",
                      gradient
                    )}
                    whileHover={{
                      scale: 1.12,
                      rotate: 8,
                      transition: { type: "spring", stiffness: 500, damping: 20 },
                    }}
                  >
                    <Icon className="size-4" />
                  </motion.div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onPointerDown={handleFabPointerDown}
          onPointerMove={handleFabPointerMove}
          onPointerUp={handleFabPointerUp}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isMenuBusy}
          whileHover={{ scale: 1.07 }}
          style={{
            scale: fabScale,
            boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
            position: "relative",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          transition={springConfig}
          className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer border-none"
        >
          {/* Long-press progress ring */}
          <svg
            className="absolute inset-0 size-full -rotate-90 pointer-events-none"
            viewBox="0 0 56 56"
          >
            <motion.circle
              cx="28"
              cy="28"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.35}
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              style={{ pathLength: pressProgress }}
            />
          </svg>

          {isMenuBusy ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <motion.div
              animate={{ rotate: isOpenMenu ? 45 : 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
            >
              <Plus className="size-6" />
            </motion.div>
          )}
        </motion.button>

        {/* Hint label — fades in while pressing, before threshold */}
        <AnimatePresence>
          {isPressing && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-7 right-0 text-[11px] text-muted-foreground whitespace-nowrap pointer-events-none"
            >
              segure para o menu
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Vault: Criar Pasta */}
      <Vault open={activeVault === "folder"} onOpenChange={(open) => !open && setActiveVault(null)}>
        <VaultContent aria-label="Criar Pasta">
          <VaultHeader>
            <VaultTitle>Nova Pasta</VaultTitle>
            <VaultDescription>Organize seus estudos e notas em um diretório próprio.</VaultDescription>
          </VaultHeader>
          <VaultBody>
            <VaultField label="Nome da Pasta" required>
              <VaultInput
                placeholder="Ex: Engenharia de Software"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && folderTitle.trim()) {
                    handleCreateFolder();
                  }
                }}
              />
            </VaultField>

            <VaultField label="Cor da Pasta">
              <div className="flex flex-wrap gap-2 pt-1">
                {tagColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFolderColor(color)}
                    className={cn(
                      "size-8 rounded-full border border-border/40 transition-all cursor-pointer",
                      color,
                      folderColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  />
                ))}
              </div>
            </VaultField>
          </VaultBody>
          <VaultFooter>
            <VaultSecondaryButton onClick={() => setActiveVault(null)}>
              Cancelar
            </VaultSecondaryButton>
            <VaultPrimaryButton
              onClick={() => handleCreateFolder()}
              disabled={!folderTitle.trim() || isSubmittingFolder}
            >
              {isSubmittingFolder ? "Criando..." : "Criar Pasta"}
            </VaultPrimaryButton>
          </VaultFooter>
        </VaultContent>
      </Vault>

      {/* Vault: Gerenciar Tags */}
      <Vault open={activeVault === "tag"} onOpenChange={(open) => !open && setActiveVault(null)}>
        <VaultContent aria-label="Tags">
          <VaultHeader>
            <VaultTitle>Organizar Tags</VaultTitle>
            <VaultDescription>Crie novas tags ou remova as existentes.</VaultDescription>
          </VaultHeader>
          <VaultBody>
            <div className="border border-border/50 bg-muted/20 p-3 rounded-lg flex flex-col gap-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Nova Tag</div>
              <div className="flex gap-2">
                <VaultInput
                  placeholder="Nome da tag..."
                  value={newTagTitle}
                  onChange={(e) => setNewTagTitle(e.target.value)}
                  className="flex-1"
                />
                <VaultPrimaryButton
                  onClick={() => handleCreateTag()}
                  disabled={!newTagTitle.trim() || isSubmittingTag}
                  className="px-4 py-2"
                >
                  Criar
                </VaultPrimaryButton>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 justify-center">
                {tagColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      "size-6 rounded-full border border-border/40 transition-all cursor-pointer",
                      color,
                      newTagColor === color && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Tags Existentes</div>
              {tags.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Nenhuma tag criada.</div>
              ) : (
                <AnimatePresence initial={false}>
                  {tags.map((tag) => (
                    <motion.div
                      key={tag.id}
                      layout
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1, transition: springConfig }}
                      exit={{ opacity: 0, x: 16, scale: 0.94, transition: { duration: 0.18, ease: "easeIn" } }}
                      className="flex items-center justify-between border border-border/40 px-3 py-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2.5 rounded-full shrink-0", tag.color)} />
                        <span className="text-sm font-medium">{tag.title}</span>
                      </div>
                      <motion.button
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={deletingTagId === tag.id}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.88 }}
                        className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-40 p-1"
                      >
                        {deletingTagId === tag.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </VaultBody>
        </VaultContent>
      </Vault>
    </>
  );
}