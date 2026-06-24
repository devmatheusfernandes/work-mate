"use server";

import { actionClient } from "@/lib/safe-action";
import { signInSchema, signUpSchema } from "./auth.schema";
import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Action de Sign In (Login)
export const signInAction = actionClient
  .schema(signInSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email: parsedInput.email,
      password: parsedInput.password,
    });

    if (error) {
      console.error("Erro de autenticação:", error.message);
      // Prevenção de Enumeração: Mensagem genérica para e-mail inexistente ou senha incorreta
      return { 
        success: false, 
        error: "E-mail ou senha incorretos." 
      };
    }

    revalidatePath("/hub", "layout");
    return { success: true };
  });

// Action de Sign Up (Cadastro)
export const signUpAction = actionClient
  .schema(signUpSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email: parsedInput.email,
      password: parsedInput.password,
    });

    if (error) {
      console.error("Erro no cadastro:", error.message);
      
      // Sanitização de erros específicos para segurança
      if (error.message.toLowerCase().includes("already registered")) {
        // Prevenção de Enumeração: Exibe a mesma mensagem de sucesso, evitando confirmar se o e-mail já existe
        return { 
          success: true, 
          message: "Cadastro efetuado! Por favor, verifique sua caixa de entrada para confirmar o e-mail." 
        };
      }
      
      return { 
        success: false, 
        error: "Não foi possível efetuar o cadastro. Tente novamente." 
      };
    }

    // Se o Supabase retornar que precisa de confirmação e a sessão ainda não está ativa
    const session = data?.session;
    if (!session) {
      return { 
        success: true, 
        message: "Cadastro efetuado! Por favor, verifique sua caixa de entrada para confirmar o e-mail." 
      };
    }

    revalidatePath("/hub", "layout");
    return { success: true };
  });

// Action de Sign Out (Logout)
export const signOutAction = actionClient.action(async () => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erro ao deslogar:", error.message);
    return { success: false, error: "Não foi possível deslogar." };
  }

  revalidatePath("/", "layout");
  return { success: true };
});
