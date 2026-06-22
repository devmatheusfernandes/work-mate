import { createSafeActionClient } from "next-safe-action";

// Helper to simulate the current user in the session
export async function getCurrentUser() {
  return {
    id: "user_matheus",
    name: "Matheus Fernandes",
    email: "matheus@workmate.com.br",
    role: "Desenvolvedor Full Stack",
  };
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
