"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/modules/chat/chat.store";
import { useCalendarStore } from "@/modules/calendar/calendar.store";
import { useDevice } from "@/hooks/ui/use-device";
import { Note, Folder, Tag, TaskStatus } from "@/modules/notes/notes.schema";
import { useCreateButton } from "./use-create-button";
import { FolderVault } from "./folder-vault";
import { TagVault } from "./tag-vault";

interface CreateButtonProps {
  activeFolderId: string | null;
  tags: Tag[];
  defaultType?: "note" | "task";
  onCreateNote?: () => void;
  onCreateTask?: (status: TaskStatus) => void;
  isTasksSidebarOpen?: boolean;
  isTasksSidebarExpanded?: boolean;
  onOpenTasksSidebar?: () => void;
  onNoteCreatedOffline?: (note: Note) => void;
  onFolderCreatedOffline?: (folder: Folder) => void;
  onTagCreatedOffline?: (tag: Tag) => void;
  onTagDeletedOffline?: (tagId: string) => void;
}

// Dot color for each menu item — encodes category with minimal visual weight
const DOT_COLOR: Record<string, string> = {
  note:          "bg-blue-400",
  task:          "bg-amber-400",
  folder:        "bg-violet-400",
  tag:           "bg-teal-400",
  pdf:           "bg-orange-400",
  chat:          "bg-pink-400",
  calendar:      "bg-fuchsia-400",
  tasks_sidebar: "bg-cyan-400",
};

// Primary actions shown first, secondary below a divider
const PRIMARY_ITEMS = ["note", "task"] as const;
const SECONDARY_ITEMS = ["folder", "tag", "pdf"] as const;
const MOBILE_EXTRA_ITEMS = ["chat", "calendar", "tasks_sidebar"] as const;

const LABELS: Record<string, string> = {
  note:          "Nova nota",
  task:          "Nova tarefa",
  folder:        "Nova pasta",
  tag:           "Tags",
  pdf:           "Subir arquivo",
  chat:          "Assistente IA",
  calendar:      "Abrir agenda",
  tasks_sidebar: "Abrir tarefas",
};

// Spring shared config
const spring = { type: "spring", stiffness: 480, damping: 32, mass: 0.75 } as const;

const containerVariants = {
  closed: {},
  open: {
    transition: { staggerChildren: 0.045, delayChildren: 0.01 },
  },
  exit: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 as const },
  },
};

const itemVariants = {
  closed: { opacity: 0, y: 8, scale: 0.93, filter: "blur(3px)" },
  open:   { opacity: 1, y: 0, scale: 1,    filter: "blur(0px)", transition: spring },
  exit:   {
    opacity: 0, y: 6, scale: 0.95, filter: "blur(2px)",
    transition: { duration: 0.12, ease: "easeIn" as const },
  },
};

const dividerVariants = {
  closed: { opacity: 0, scaleX: 0 },
  open:   { opacity: 1, scaleX: 1, transition: { delay: 0.08, duration: 0.2 } },
  exit:   { opacity: 0, transition: { duration: 0.1 } },
};

// ─────────────────────────────────────────────
// Pill menu item
// ─────────────────────────────────────────────
function MenuItem({
  itemKey,
  disabled,
  onClick,
}: {
  itemKey: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ x: -2, transition: { type: "spring", stiffness: 500, damping: 30 } }}
      whileTap={{ scale: 0.96 }}
      className="flex items-center justify-end cursor-pointer"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-[7px] rounded-full text-sm",
          "bg-card border border-border text-foreground",
          "hover:bg-muted/70 hover:border-border/80",
          "transition-colors duration-150",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Color dot — replaces heavy gradient icon circle */}
        <span
          className={cn(
            "size-[6px] rounded-full flex-shrink-0",
            DOT_COLOR[itemKey] ?? "bg-muted-foreground"
          )}
        />
        <span className="leading-none">{LABELS[itemKey]}</span>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// Thin divider between primary / secondary groups
// ─────────────────────────────────────────────
function MenuDivider() {
  return (
    <motion.div
      variants={dividerVariants}
      className="h-px w-8 self-end mr-1 bg-border origin-right"
    />
  );
}

// ─────────────────────────────────────────────
// CreateButton
// ─────────────────────────────────────────────
export function CreateButton({
  activeFolderId,
  tags,
  defaultType = "note",
  onCreateNote,
  onCreateTask,
  isTasksSidebarOpen = false,
  isTasksSidebarExpanded = false,
  onOpenTasksSidebar,
  onNoteCreatedOffline,
  onFolderCreatedOffline,
  onTagCreatedOffline,
  onTagDeletedOffline,
}: CreateButtonProps) {
  const isChatOpen     = useChatStore((s) => s.isSidebarOpen);
  const isCalendarOpen = useCalendarStore((s) => s.isSidebarOpen);
  const { isMobile }   = useDevice();

  // Dynamic right offset based on open sidebars
  let rightOffset = 24;
  if (!isMobile) {
    if (isChatOpen)          rightOffset += 390;
    if (isCalendarOpen)      rightOffset += 320;
    if (isTasksSidebarOpen)  rightOffset += isTasksSidebarExpanded ? 480 : 320;
  }

  const [activeVault, setActiveVault] = useState<"folder" | "tag" | null>(null);

  const {
    isOpenMenu,
    isMenuBusy,
    fileInputRef,
    menuRef,
    handleFileChange,
    handleMenuItemClick,
    isPressing,
    pressProgress,
    fabScale,
    handleFabPointerDown,
    handleFabPointerMove,
    handleFabPointerUp,
    cancelPress,
  } = useCreateButton({
    activeFolderId,
    defaultType,
    onCreateNote,
    onCreateTask,
    onNoteCreatedOffline,
    onOpenTasksSidebar,
    setActiveVault,
  });

  // Build ordered item keys for the menu
  const primaryKeys   = [...PRIMARY_ITEMS];
  const secondaryKeys = [...SECONDARY_ITEMS];
  const mobileKeys    = isMobile ? [...MOBILE_EXTRA_ITEMS] : [];

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
        className="hidden"
      />

      <motion.div
        ref={menuRef}
        animate={{ right: rightOffset }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-6 z-50 flex flex-col items-end gap-3"
      >
        {/* ── Menu items ── */}
        <AnimatePresence>
          {isOpenMenu && (
            <motion.div
              className="flex flex-col gap-[5px] items-end mb-1"
              variants={containerVariants}
              initial="closed"
              animate="open"
              exit="exit"
            >
              {/* Primary: nota + tarefa */}
              {primaryKeys.map((key) => (
                <MenuItem
                  key={key}
                  itemKey={key}
                  disabled={isMenuBusy}
                  onClick={() => handleMenuItemClick(key)}
                />
              ))}

              {/* Thin divider */}
              <MenuDivider />

              {/* Secondary: pasta, tags, PDF */}
              {secondaryKeys.map((key) => (
                <MenuItem
                  key={key}
                  itemKey={key}
                  disabled={isMenuBusy}
                  onClick={() => handleMenuItemClick(key)}
                />
              ))}

              {/* Mobile extras */}
              {mobileKeys.length > 0 && (
                <>
                  <MenuDivider />
                  {mobileKeys.map((key) => (
                    <MenuItem
                      key={key}
                      itemKey={key}
                      disabled={isMenuBusy}
                      onClick={() => handleMenuItemClick(key)}
                    />
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main FAB ── */}
        <motion.button
          onPointerDown={handleFabPointerDown}
          onPointerMove={handleFabPointerMove}
          onPointerUp={handleFabPointerUp}
          onPointerCancel={cancelPress}
          onContextMenu={(e) => e.preventDefault()}
          disabled={isMenuBusy}
          whileHover={{ scale: 1.06 }}
          style={{
            scale: fabScale,
            position: "relative",
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
          transition={spring}
          className={cn(
            "flex size-12 items-center justify-center rounded-full cursor-pointer border-none",
            "bg-foreground text-background",
            "hover:opacity-90 transition-opacity",
            isOpenMenu && "opacity-75"
          )}
          aria-label={isOpenMenu ? "Fechar menu" : "Criar novo item"}
        >
          {/* Long-press progress ring */}
          <motion.svg
            className="absolute inset-0 size-full -rotate-90 pointer-events-none"
            viewBox="0 0 48 48"
            initial={{ opacity: 0 }}
            animate={{ opacity: isPressing ? 1 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={1}
              style={{ pathLength: pressProgress }}
            />
          </motion.svg>

          {isMenuBusy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <motion.svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="size-5"
              animate={{ rotate: isOpenMenu ? 45 : 0 }}
              transition={spring}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5"  y1="12" x2="19" y2="12" />
            </motion.svg>
          )}
        </motion.button>

        {/* Long-press hint */}
        <AnimatePresence>
          {isPressing && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-6 right-0 text-[11px] text-muted-foreground whitespace-nowrap pointer-events-none"
            >
              segure para o menu
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Vaults */}
      <FolderVault
        open={activeVault === "folder"}
        onOpenChange={(open) => setActiveVault(open ? "folder" : null)}
        activeFolderId={activeFolderId}
        onFolderCreatedOffline={onFolderCreatedOffline}
      />
      <TagVault
        open={activeVault === "tag"}
        onOpenChange={(open) => setActiveVault(open ? "tag" : null)}
        tags={tags}
        onTagCreatedOffline={onTagCreatedOffline}
        onTagDeletedOffline={onTagDeletedOffline}
      />
    </>
  );
}