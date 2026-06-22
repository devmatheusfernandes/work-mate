import {
  User,
  CheckSquare,
  Settings,
  Users,
  Trash,
  Calendar,
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
    href: "/hub/trash",
    label: "Lixeira",
    Icon: Trash,
  },
  {
    href: "/hub/calendar",
    label: "Calendário",
    Icon: Calendar,
  },
  {
    href: "/hub/tasks",
    label: "Tarefas",
    Icon: CheckSquare,
    badgeCount: 3,
  },
  {
    href: "/hub/team",
    label: "Equipe",
    Icon: Users,
  },
  {
    href: "/hub/settings",
    label: "Configurações",
    labelKey: "settings",
    Icon: Settings,
  },
];
