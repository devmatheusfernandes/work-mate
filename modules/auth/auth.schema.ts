import { z } from "zod";

// Validador de credenciais para Sign In
export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "O e-mail é obrigatório")
    .email("Insira um endereço de e-mail válido")
    .max(255, "E-mail muito longo"),
  password: z
    .string()
    .min(1, "A senha é obrigatória")
    .min(8, "A senha deve conter pelo menos 8 caracteres"),
});

// Validador de dados para Sign Up com regras rígidas de segurança de senha
export const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, "O e-mail é obrigatório")
      .email("Insira um endereço de e-mail válido")
      .max(255, "E-mail muito longo"),
    password: z
      .string()
      .min(1, "A senha é obrigatória")
      .min(8, "A senha deve conter pelo menos 8 caracteres")
      .max(72, "A senha é muito longa") // Limite do bcrypt/algoritmos internos do Supabase
      .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "A senha deve conter pelo menos um número")
      .regex(/[^a-zA-Z0-9]/, "A senha deve conter pelo menos um caractere especial"),
    confirmPassword: z.string().min(1, "A confirmação de senha é obrigatória"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignInOutput = z.infer<typeof signInSchema>;
export type SignUpOutput = z.infer<typeof signUpSchema>;
