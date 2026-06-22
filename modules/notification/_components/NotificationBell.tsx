import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full relative"
            title="Notificações (Em breve)"
        >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notificações</span>
            {/* Optional dot showing there is something new, or just blank for now */}
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
        </Button>
    );
}
