"use client";

import { isPathActive } from "@/utils/pathname";
import { MenuItemType, SubMenuItem } from "@/components/layout/types";
import * as Collapsible from "@radix-ui/react-collapsible";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { useRef } from "react";

interface SidebarItemProps {
  item: MenuItemType;
  isCollapsed: boolean;
}

interface AnimatedIconHandle {
  startAnimation?: () => void;
  stopAnimation?: () => void;
}

export default function SidebarItem({ item, isCollapsed }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive =
    isPathActive(pathname, item.href) ||
    (item.subItems?.some((subItem: SubMenuItem) =>
      isPathActive(pathname, subItem.href),
    ) ??
      false);

  const iconRef = useRef<AnimatedIconHandle>(null);
  const Icon = item.Icon;
  const iconNode = Icon ? (
    <Icon ref={iconRef} {...(item.iconProps ?? {})} />
  ) : (
    item.icon
  );

  const handleMouseEnter = () => {
    iconRef.current?.startAnimation?.();
  };

  const handleMouseLeave = () => {
    iconRef.current?.stopAnimation?.();
  };

  if (item.subItems) {
    return (
      <Collapsible.Root className="w-full">
        <Collapsible.Trigger className="w-full">
          <motion.div
            whileHover={{ x: isCollapsed ? 0 : 4 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={twMerge(
              "flex items-center h-12 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200",
              isActive && "bg-accent text-accent-foreground",
              isCollapsed && "justify-center px-3",
            )}
          >
            <motion.div
              whileHover={{ rotate: isCollapsed ? 0 : 5 }}
              className="w-5 h-5 flex items-center justify-center relative"
            >
              {iconNode}
              {isCollapsed && item.badgeCount && item.badgeCount > 0 ? (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
                  {item.badgeCount > 9 ? "9+" : item.badgeCount}
                </div>
              ) : null}
            </motion.div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="ml-3 flex-1 whitespace-nowrap text-left overflow-hidden flex items-center justify-between"
                >
                  {item.label}
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {item.badgeCount > 99 ? "99+" : item.badgeCount}
                    </span>
                  ) : null}
                </motion.span>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="w-5 h-5 flex items-center justify-center ml-auto"
                >
                  <ArrowDown className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Collapsible.Trigger>
        <Collapsible.Content className="overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={twMerge(
              "pl-6 flex flex-col gap-1 py-1",
              isCollapsed && "pl-0",
            )}
          >
            {item.subItems.map((subItem, index) => (
              <motion.div
                key={subItem.href}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={subItem.href}
                  className={twMerge(
                    "flex items-center h-10 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-200",
                    isPathActive(pathname, subItem.href) &&
                    "bg-muted text-foreground",
                    isCollapsed && "justify-center px-3",
                  )}
                >
                  <div className="w-4 h-4 flex items-center justify-center">
                    {subItem.icon}
                  </div>
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="ml-3 whitespace-nowrap"
                      >
                        {subItem.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }

  return (
    <Link href={item.href}>
      <motion.div
        whileHover={{ x: isCollapsed ? 0 : 4, scale: isCollapsed ? 1.05 : 1 }}
        whileTap={{ scale: 0.98 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={twMerge(
          "flex items-center h-12 px-3 py-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/15 transition-all ease-in-out duration-300",
          isActive && "bg-primary/30 text-primary font-semibold",
          isCollapsed && "justify-center px-3",
        )}
      >
        <motion.div
          whileHover={{ rotate: isCollapsed ? 0 : 5 }}
          className="w-5 h-5 flex items-center justify-center relative"
        >
          {iconNode}
          {isCollapsed && item.badgeCount && item.badgeCount > 0 ? (
            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
              {item.badgeCount > 9 ? "9+" : item.badgeCount}
            </div>
          ) : null}
        </motion.div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 flex-1 whitespace-nowrap overflow-hidden flex items-center justify-between"
            >
              {item.label}
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {item.badgeCount > 99 ? "99+" : item.badgeCount}
                </span>
              ) : null}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
}
