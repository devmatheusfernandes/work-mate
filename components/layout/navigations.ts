import {
  User,
  CheckSquare,
  Settings,
  Trash,
  MessageSquare,
} from "lucide-react";
import { MenuItemType } from "./types";

export const sidebarNavItems: MenuItemType[] = [
  {
    href: "/hub/notes",
    label: "Notas",
    Icon: User,
  },
  {
    href: "/hub/archive",
    label: "Arquivadas",
    Icon: CheckSquare,
    badgeCount: 3,
  },
  {
    href: "/hub/chat",
    label: "Conversas",
    Icon: MessageSquare,
  },
  {
    href: "/hub/tasks",
    label: "Tarefas",
    Icon: CheckSquare,
    badgeCount: 3,
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
