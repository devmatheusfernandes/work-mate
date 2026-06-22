"use client";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCollapsedStore } from "./collapsed-store";
import { cn } from "@/lib/utils";

export function SidebarTrigger({ className }: { className?: string }) {
  const isCollapsed = useCollapsedStore((state) => state.isCollapsed);
  const toggleSidebar = useCollapsedStore((state) => state.toggleSidebar);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("rounded-full", className)}
      onClick={toggleSidebar}
    >
      {isCollapsed ? (
        <PanelLeftOpen className="h-5 w-5" />
      ) : (
        <PanelLeftClose className="h-5 w-5" />
      )}
    </Button>
  );
}
