"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    __pwa_initializing?: boolean;
  }
}

export function ThemeColorUpdater() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const updateColor = () => {
      const isInitializing =
        typeof window !== "undefined" &&
        (!!window.__pwa_initializing||
          document.documentElement.classList.contains("pwa-initializing"));

      const lightColor = "#f0f0f0"; // Cinza bem claro (oklch(95.514% 0.00011 271.152))
      const darkColor = "#02060e";  // Cor escura (oklch(12.048% 0.02283 254.114))
      const splashColor = "#212121"; // Cor da splash screen

      const currentColor = isInitializing
        ? splashColor
        : resolvedTheme === "dark"
        ? darkColor
        : lightColor;

      // Busca todas as tags meta theme-color existentes no documento
      const existingMetas = document.querySelectorAll('meta[name="theme-color"]');

      if (existingMetas.length > 0) {
        // Atualiza os atributos sem remover os elementos do DOM para evitar que o React quebre no commitDeletion
        existingMetas.forEach((meta) => {
          meta.setAttribute("content", currentColor);
          meta.removeAttribute("media");
        });
      } else {
        // Se não existir nenhuma tag, cria uma nova
        const metaThemeColor = document.createElement("meta");
        metaThemeColor.setAttribute("name", "theme-color");
        metaThemeColor.setAttribute("content", currentColor);
        document.head.appendChild(metaThemeColor);
      }
    };

    // Atualiza inicialmente
    updateColor();

    // Escuta evento customizado disparado quando o splash termina
    window.addEventListener("pwa-splash-hidden", updateColor);

    // Observa mudanças nas classes do elemento HTML para saber quando "pwa-initializing" for removida
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateColor();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("pwa-splash-hidden", updateColor);
      observer.disconnect();
    };
  }, [resolvedTheme, pathname]); // Roda sempre que o tema ou o caminho mudar

  return null; // Este componente não renderiza nada na tela
}