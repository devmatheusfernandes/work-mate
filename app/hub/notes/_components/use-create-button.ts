"use client";

import { useState, useRef, useCallback, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSpring, useTransform } from "framer-motion";
import { useChatStore } from "@/modules/chat/chat.store";
import { useCalendarStore } from "@/modules/calendar/calendar.store";
import { createNoteAction } from "@/modules/notes/notes.actions";
import { Note, TaskStatus } from "@/modules/notes/notes.schema";
import { saveOfflineItem } from "@/lib/offline-db";

interface UseCreateButtonProps {
  activeFolderId: string | null;
  defaultType?: "note" | "task";
  onCreateNote?: () => void;
  onCreateTask?: (status: TaskStatus) => void;
  onNoteCreatedOffline?: (note: Note) => void;
  onOpenTasksSidebar?: () => void;
  setActiveVault: (vault: "folder" | "tag" | null) => void;
}

export function useCreateButton({
  activeFolderId,
  defaultType = "note",
  onCreateNote,
  onCreateTask,
  onNoteCreatedOffline,
  onOpenTasksSidebar,
  setActiveVault,
}: UseCreateButtonProps) {
  const router = useRouter();
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const setCalendarSidebarOpen = useCalendarStore((state) => state.setSidebarOpen);
  
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const isMenuBusy = isCreatingNote || isCreatingTask || isUploadingPdf;

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

  const handleCreateNote = useCallback(async () => {
    if (onCreateNote) {
      onCreateNote();
      return;
    }
    setIsCreatingNote(true);
    setIsOpenMenu(false);

    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    const createOffline = async () => {
      const tempId = `temp_note_${Date.now()}`;
      const newNote: Note = {
        userId: "local",
        id: tempId,
        title: "Nova Nota",
        folderId: activeFolderId,
        type: "note",
        content: "",
        searchText: "",
        tagIds: [] as string[],
        archived: false,
        trashed: false,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocked: false,
        taskStatus: null,
        taskDeadline: null,
        taskSubtasks: [],
        taskShouldNotify: false,
      };

      await saveOfflineItem("notes", newNote);
      await saveOfflineItem("syncQueue", {
        id: `op_${tempId}`,
        actionName: "createNote",
        payload: {
          id: tempId,
          title: "Nova Nota",
          folderId: activeFolderId,
          type: "note",
        },
        timestamp: Date.now(),
      });

      toast.success("Nota criada offline!");
      if (onNoteCreatedOffline) {
        onNoteCreatedOffline(newNote);
      } else {
        window.location.reload();
      }
    };

    if (isOffline) {
      try {
        await createOffline();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao criar nota offline.");
      } finally {
        setIsCreatingNote(false);
      }
      return;
    }

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
      try {
        toast.loading("Sem conexão. Salvando nota offline...", { id: toastId });
        await createOffline();
        toast.dismiss(toastId);
      } catch (offlineErr) {
        console.error(offlineErr);
        toast.error("Erro inesperado ao criar nota.", { id: toastId });
      }
    } finally {
      setIsCreatingNote(false);
    }
  }, [activeFolderId, router, onNoteCreatedOffline, onCreateNote]);

  const handleCreateTask = useCallback(async () => {
    if (onCreateTask) {
      onCreateTask("to_start");
      return;
    }
    setIsCreatingTask(true);
    setIsOpenMenu(false);

    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    const createOffline = async () => {
      const tempId = `temp_task_${Date.now()}`;
      const newNote: Note = {
        userId: "local",
        id: tempId,
        title: "Nova Tarefa",
        folderId: activeFolderId,
        type: "task",
        content: "",
        searchText: "",
        tagIds: [] as string[],
        archived: false,
        trashed: false,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isLocked: false,
        taskStatus: "to_start",
        taskDeadline: null,
        taskSubtasks: [],
        taskShouldNotify: false,
      };

      await saveOfflineItem("notes", newNote);
      await saveOfflineItem("syncQueue", {
        id: `op_${tempId}`,
        actionName: "createNote",
        payload: {
          id: tempId,
          title: "Nova Tarefa",
          folderId: activeFolderId,
          type: "task",
          taskStatus: "to_start",
        },
        timestamp: Date.now(),
      });

      toast.success("Tarefa criada offline!");
      if (onNoteCreatedOffline) {
        onNoteCreatedOffline(newNote);
      } else {
        window.location.reload();
      }
    };

    if (isOffline) {
      try {
        await createOffline();
      } catch (err) {
        console.error(err);
        toast.error("Erro ao criar tarefa offline.");
      } finally {
        setIsCreatingTask(false);
      }
      return;
    }

    const toastId = toast.loading("Criando tarefa...");
    try {
      const res = await createNoteAction({
        title: "Nova Tarefa",
        folderId: activeFolderId,
        type: "task",
        taskStatus: "to_start",
      });

      if (res?.data?.success && res.data.note) {
        toast.success("Tarefa criada com sucesso!", { id: toastId });
        if (window.location.pathname === "/hub/tasks") {
          router.push(`/hub/tasks?taskId=${res.data.note.id}`);
        } else {
          router.push(`/hub/notes/${res.data.note.id}`);
        }
      } else {
        toast.error(res?.serverError || "Erro ao criar tarefa.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      try {
        toast.loading("Sem conexão. Salvando tarefa offline...", { id: toastId });
        await createOffline();
        toast.dismiss(toastId);
      } catch (offlineErr) {
        console.error(offlineErr);
        toast.error("Erro inesperado ao criar tarefa.", { id: toastId });
      }
    } finally {
      setIsCreatingTask(false);
    }
  }, [activeFolderId, router, onNoteCreatedOffline, onCreateTask]);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const isPdf = file.type === "application/pdf" || fileExtension === "pdf";
    const isExcel = ["xlsx", "xls", "csv"].includes(fileExtension || "");

    if (!isPdf && !isExcel) {
      toast.error("Por favor, selecione um arquivo PDF, Excel (.xlsx, .xls) ou CSV (.csv).");
      return;
    }

    const type = isPdf ? "pdf" : "excel";
    const label = isPdf ? "PDF" : "planilha";
    const uploadUrl = isPdf ? "/api/notes/upload-pdf" : "/api/notes/upload-excel";

    setIsUploadingPdf(true);
    setIsOpenMenu(false);
    const toastId = toast.loading(`Enviando ${label}...`);

    const isOffline = typeof window !== "undefined" && !window.navigator.onLine;

    if (isOffline) {
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const fileUrl = reader.result as string;
          const tempId = `temp_file_${Date.now()}`;
          const newFileNote: Note = {
            userId: "local",
            id: tempId,
            title: file.name.replace(/\.[^/.]+$/, ""),
            folderId: activeFolderId,
            type,
            fileUrl,
            archived: false,
            trashed: false,
            pinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isLocked: false,
            tagIds: [] as string[],
            content: "",
            searchText: "",
            taskStatus: null,
            taskDeadline: null,
            taskSubtasks: [],
            taskShouldNotify: false,
          };

          try {
            await saveOfflineItem("notes", newFileNote);
            await saveOfflineItem("syncQueue", {
              id: `op_${tempId}`,
              actionName: "createNote",
              payload: {
                id: tempId,
                title: file.name.replace(/\.[^/.]+$/, ""),
                folderId: activeFolderId,
                type,
                fileUrl,
              },
              timestamp: Date.now(),
            });

            toast.success(`${isPdf ? "PDF" : "Planilha"} salva localmente offline!`, { id: toastId });
            if (onNoteCreatedOffline) {
              onNoteCreatedOffline(newFileNote);
            } else {
              window.location.reload();
            }
          } catch (err) {
            console.error(err);
            toast.error(`Erro ao salvar ${label} offline.`, { id: toastId });
          } finally {
            setIsUploadingPdf(false);
          }
        };
        reader.onerror = () => {
          toast.error("Erro ao ler o arquivo.", { id: toastId });
          setIsUploadingPdf(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error(err);
        toast.error(`Erro inesperado ao salvar ${label} offline.`, { id: toastId });
        setIsUploadingPdf(false);
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
      if (activeFolderId) {
        formData.append("folderId", activeFolderId);
      }

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || `Erro ao enviar ${label}.`, { id: toastId });
        return;
      }

      toast.success(`${isPdf ? "PDF" : "Planilha"} enviada com sucesso!`, { id: toastId });
      router.push(`/hub/notes/${data.note.id}`);
    } catch (err) {
      console.error(err);
      toast.error(`Erro inesperado ao enviar ${label}.`, { id: toastId });
    } finally {
      setIsUploadingPdf(false);
      if (e.target) e.target.value = "";
    }
  }, [activeFolderId, router, onNoteCreatedOffline]);


  const handleMenuItemClick = (key: string) => {
    switch (key) {
      case "note":
        handleCreateNote();
        break;
      case "task":
        handleCreateTask();
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
      case "chat":
        setIsOpenMenu(false);
        setSidebarOpen(true);
        break;
      case "calendar":
        setIsOpenMenu(false);
        setCalendarSidebarOpen(true);
        break;
      case "tasks_sidebar":
        setIsOpenMenu(false);
        if (onOpenTasksSidebar) {
          onOpenTasksSidebar();
        } else {
          router.push("/hub/tasks");
        }
        break;
    }
  };

  // --- Pointer & Long Press Handlers ---
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
        if (defaultType === "task") {
          handleCreateTask();
        } else {
          handleCreateNote();
        }
      }
    }
  }, [cancelPress, isMenuBusy, isOpenMenu, defaultType, handleCreateTask, handleCreateNote]);

  return {
    isOpenMenu,
    setIsOpenMenu,
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
  };
}
