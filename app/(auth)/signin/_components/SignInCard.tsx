"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignInInput } from "@/modules/auth/auth.schema";
import { signInAction } from "@/modules/auth/auth.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export function SignInCard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInInput) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await signInAction(data);

      if (result?.data?.success) {
        toast.success("Login efetuado com sucesso!");
        router.push("/hub");
      } else {
        toast.error(result?.data?.error || "E-mail ou senha incorretos.");
      }
    } catch (error) {
      console.error("Erro inesperado no login:", error);
      toast.error("Ocorreu um erro ao tentar entrar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card flex flex-col p-6 md:p-8 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl">
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">WorkMate</h1>
        <p className="text-sm text-neutral-400">
          Entre na sua conta para gerenciar suas notas e tarefas
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Campo E-mail */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5" htmlFor="email">
            <Mail className="w-3.5 h-3.5" />
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            placeholder="nome@exemplo.com"
            disabled={isLoading}
            hasError={!!errors.email}
            {...register("email")}
            className="bg-neutral-950/50 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 h-11"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Campo Senha */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5" htmlFor="password">
              <Lock className="w-3.5 h-3.5" />
              Senha
            </label>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              disabled={isLoading}
              hasError={!!errors.password}
              {...register("password")}
              className="bg-neutral-950/50 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Botão de Submit */}
        <Button
          type="submit"
          isLoading={isLoading}
          fullWidth
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-md flex items-center justify-center cursor-pointer mt-6"
        >
          Entrar
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-neutral-400">
        Não tem uma conta?{" "}
        <Link href="/signup" className="text-blue-500 hover:underline font-medium">
          Cadastre-se
        </Link>
      </div>
    </div>
  );
}
