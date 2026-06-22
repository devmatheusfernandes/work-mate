"use client";

import { Moon, Sun, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppearanceStore } from "@/modules/appearance/appearance.store";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeSwitcher() {
    const { setTheme } = useTheme();
    const { mode, setMode } = useAppearanceStore();

    const handleModeChange = (newMode: "light" | "dark" | "system", e?: React.MouseEvent) => {
        // Função que efetivamente troca o tema
        const updateTheme = () => {
            setMode(newMode);
            setTheme(newMode);
        };

        // Se o navegador não suportar View Transitions (ou não passarmos o evento), troca seco.
        if (!document.startViewTransition || !e) {
            updateTheme();
            return;
        }

        // 1. Pegamos a posição exata de onde o usuário clicou
        const x = e.clientX;
        const y = e.clientY;

        // 2. Calculamos o tamanho máximo que o círculo precisa ter para cobrir a tela toda
        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        // 3. Iniciamos a transição nativa
        const transition = document.startViewTransition(updateTheme);

        // 4. Quando o DOM do novo tema estiver pronto, rodamos a animação de clip-path
        transition.ready.then(() => {
            const clipPath = [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
            ];

            // Injetamos a animação direto na raiz do documento
            document.documentElement.animate(
                { clipPath },
                {
                    duration: 500, // Duração em ms
                    easing: "ease-in-out",
                    // Isso aplica a animação no "print" da nova tela
                    pseudoElement: "::view-transition-new(root)",
                }
            );
        });
    };

    const modes = [
        { value: "light", label: "Claro", icon: Sun },
        { value: "dark", label: "Escuro", icon: Moon },
        { value: "system", label: "Sistema", icon: Monitor },
    ] as const;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full relative">
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                {modes.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem
                        key={value}
                        // Aqui passamos o evento 'e' para podermos pegar o x e y do clique
                        onClick={(e) => handleModeChange(value, e)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex items-center">
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{label}</span>
                        </div>
                        {mode === value && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}