import { createSafeActionClient } from "next-safe-action";

import { createClient } from "./supabase-server";

// Helper to retrieve the actual authenticated user from the Supabase session
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    return {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Membro",
      email: user.email || "",
      role: "Membro",
    };
  } catch (error) {
    console.error("Erro ao obter usuário atual:", error);
    return null;
  }
}

// Global action client
export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e);
    return "Ocorreu um erro interno no servidor.";
  },
});

// Protected action that requires authentication (injects ctx.user)
export const protectedAction = actionClient.use(async ({ next }) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autorizado");
  }
  return next({
    ctx: {
      user,
    },
  });
});
