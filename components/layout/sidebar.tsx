"use client";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import SidebarItem from "./sidebar-item";
import { MenuItemType } from "@/components/layout/types";
import { useCollapsedStore } from "./collapsed-store";
import { SidebarTrigger } from "./sidebar-trigger";
import Logo from "@/public/brand/logo.png";
import Image from "next/image";

export interface SidebarProps {
    items: MenuItemType[];
}

export const Sidebar: React.FC<SidebarProps> = ({ items }) => {
    const pathname = usePathname();
    const isCollapsed = useCollapsedStore((state) => state.isCollapsed);

    //Para esconder a sidebar
    const isPracticeSession = pathname.includes("/hub/student/practice/session");
    if (isPracticeSession) return null;

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
                            {!isCollapsed && <Image src={Logo} alt="Logo" width={140} style={{ height: "auto" }} priority /> }
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