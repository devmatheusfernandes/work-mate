import * as React from "react";
import { User, LogOut, Settings, Shield } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface UserMenuProps {
    user: {
        name: string | null;
        email: string | null;
        photoUrl?: string | null;
        role?: string;
    };
}

export function UserMenu({ user }: UserMenuProps) {
    const initials = React.useMemo(() => {
        if (!user.name) return "U";
        return user.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    }, [user.name]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-muted flex items-center justify-center p-0 overflow-hidden">
                    {user.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.photoUrl} alt={user.name || "User"} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-xs font-semibold">{initials}</span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name || "Usuário"}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email || ""}</p>
                        {user.role && (
                            <div className="flex items-center gap-1 mt-1.5">
                                <Shield className="h-3 w-3 text-primary" />
                                <span className="text-[10px] uppercase font-bold text-primary">{user.role}</span>
                            </div>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/20 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
