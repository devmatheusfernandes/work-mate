"use client";
import * as React from "react";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import SidebarItem from "./sidebar-item";
import { MenuItemType } from "@/components/layout/types";
import { useCollapsedStore } from "./collapsed-store";
import { SidebarTrigger } from "./sidebar-trigger";
import { sidebarNavItems } from "./navigations";
import { useDevice } from "@/hooks/ui/use-device";
import { Vault, VaultContent, VaultTitle } from "@/components/ui/vault";

export interface SidebarProps {
    items?: MenuItemType[];
}

export const Sidebar: React.FC<SidebarProps> = ({ items = sidebarNavItems }) => {
    const isCollapsed = useCollapsedStore((state) => state.isCollapsed);
    const setCollapsed = useCollapsedStore((state) => state.setCollapsed);
    const { isMobile, isStandalone } = useDevice();
    const isMobileOrPwa = isMobile || isStandalone;

    React.useEffect(() => {
        if (isMobileOrPwa) {
            setCollapsed(true);
        }
    }, [isMobileOrPwa, setCollapsed]);

    if (isMobileOrPwa) {
        return (
            <Vault open={!isCollapsed} onOpenChange={(open) => setCollapsed(!open)}>
                <VaultContent aria-label="Menu de Navegação" noPadding className="h-full max-h-[85vh]">
                    <VaultTitle className="sr-only">Menu de Navegação</VaultTitle>
                    <div className="flex flex-col gap-1 py-4 px-3">
                        {items.map((item) => (
                            <SidebarItem 
                                key={item.href} 
                                item={item} 
                                isCollapsed={false} 
                                onClick={() => setCollapsed(true)} 
                            />
                        ))}
                    </div>
                </VaultContent>
            </Vault>
        );
    }

    return (
        <>
            <motion.aside
                animate={{
                    width: isCollapsed ? 48 : 256,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex flex-col items-center mx-auto lg:ml-2 max-h-full"
            > 
                <motion.div
                    layout
                    className={twMerge(
                        "flex flex-col w-full h-full",
                        !isCollapsed && "px-2 gap-3 pt-4",
                    )}
                >
                    <motion.nav
                        layout
                        className={twMerge(
                            "flex flex-col gap-2 flex-1",
                            isCollapsed && "w-fit items-center mt-4",
                            !isCollapsed && "w-full",
                        )}
                    >
                        <div className={twMerge(
                            "flex items-center mb-4 transition-all duration-300",
                            isCollapsed ? "justify-center" : "px-3 justify-between"
                        )}>
                            <SidebarTrigger />
                        </div>

                        {items.filter(item => item.labelKey !== "settings").map((item, index) => (
                            <motion.div
                                key={item.href}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <SidebarItem item={item} isCollapsed={isCollapsed} />
                            </motion.div>
                        ))}

                        <div className="mt-auto flex flex-col gap-2 mb-4">
                            {items.filter(item => item.labelKey === "settings").map((item, index) => (
                                <motion.div
                                    key={item.href}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (items.length - 1 + index) * 0.05 }}
                                >
                                    <SidebarItem item={item} isCollapsed={isCollapsed} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.nav>
                </motion.div>
            </motion.aside>
        </>
    );
};