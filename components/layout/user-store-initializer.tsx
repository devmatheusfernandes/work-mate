"use client";

import { useEffect } from "react";
import { useUserStore } from "@/modules/user/user.store";

interface UserStoreInitializerProps {
  user: {
    name: string | null;
    email: string | null;
    photoUrl?: string | null;
    role?: string;
  } | null;
}

export function UserStoreInitializer({ user }: UserStoreInitializerProps) {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);

  return null;
}
