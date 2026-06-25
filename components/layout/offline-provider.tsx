"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { syncManager, SyncStatus } from "@/lib/sync-manager";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineContextType {
  status: SyncStatus;
  pendingCount: number;
}

const OfflineContext = createContext<OfflineContextType>({
  status: "online",
  pendingCount: 0,
});

export const useOffline = () => useContext(OfflineContext);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>("online");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Subscribe to SyncManager status changes
    const unsubscribe = syncManager.subscribe((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    // Request notification permission for background task replies
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ status, pendingCount }}>
      {children}

      {/* Connectivity Banner / Pill */}
      <AnimatePresence>
        {status !== "online" && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-6 left-6 z-[9999] pointer-events-auto"
          >
            <div
              className={cn(
                "flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-semibold shadow-xl backdrop-blur-md transition-colors duration-300",
                status === "offline" && "border-amber-500/30 bg-amber-500/10 text-amber-500",
                status === "syncing" && "border-primary/30 bg-primary/10 text-primary",
                status === "synced" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              )}
            >
              {status === "offline" && (
                <>
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span>
                    Offline — Modo Leitura (
                    {pendingCount > 0
                      ? `${pendingCount} pendente(s)`
                      : "Salvo localmente"}
                    )
                  </span>
                </>
              )}
              {status === "syncing" && (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Sincronizando alterações...</span>
                </>
              )}
              {status === "synced" && (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Alterações sincronizadas!</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </OfflineContext.Provider>
  );
}
