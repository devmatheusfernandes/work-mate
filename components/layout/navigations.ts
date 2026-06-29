import {
  StickyNote,
  Archive,
  Settings,
  Trash,
  MessageCircle,
  ListTodo,
} from "lucide-react";
import { MenuItemType } from "./types";

export const sidebarNavItems: MenuItemType[] = [
  {
    href: "/hub/notes",
    label: "Notas",
    Icon: StickyNote,
  },
  {
    href: "/hub/archive",
    label: "Arquivadas",
    Icon: Archive,
  },
  {
    href: "/hub/chat",
    label: "Conversas",
    Icon: MessageCircle,
  },
  {
    href: "/hub/tasks",
    label: "Tarefas",
    Icon: ListTodo,
  },
  {
    href: "/hub/settings",
    label: "Configurações",
    labelKey: "settings",
    Icon: Settings,
  },
  {
    href: "/hub/trash",
    label: "Lixeira",
    Icon: Trash,
  },
];
