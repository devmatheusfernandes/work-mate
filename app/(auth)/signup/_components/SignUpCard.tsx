"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/modules/auth/auth.schema";
import { signUpAction } from "@/modules/auth/auth.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function SignUpCard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = useWatch({ control, name: "password" }) || "";

  // Auxiliares para checar regras de força de senha em tempo real
  const requirements = [
    { label: "Mínimo de 8 caracteres", test: (val: string) => val.length >= 8 },
    { label: "Pelo menos uma letra maiúscula", test: (val: string) => /[A-Z]/.test(val) },
    { label: "Pelo menos uma letra minúscula", test: (val: string) => /[a-z]/.test(val) },
    { label: "Pelo menos um número", test: (val: string) => /[0-9]/.test(val) },
    { label: "Pelo menos um caractere especial (!@#$ etc.)", test: (val: string) => /[^a-zA-Z0-9]/.test(val) },
  ];

  const onSubmit = async (data: SignUpInput) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await signUpAction(data);

      if (result?.data?.success) {
        if (result.data.message?.includes("verifique sua caixa") || result.data.message?.includes("confirmar")) {
          setRegisteredEmail(data.email);
          setIsSuccess(true);
          toast.success(result.data.message);
        } else {
          toast.success("Cadastro efetuado com sucesso!");
          router.push("/hub");
        }
      } else {
        toast.error(result?.data?.error || "Falha ao cadastrar.");
      }
    } catch (error) {
      console.error("Erro inesperado no cadastro:", error);
      toast.error("Ocorreu um erro no servidor. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="card flex flex-col p-6 md:p-8 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl text-center items-center">
        <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Verifique seu e-mail</h2>
        <p className="text-sm text-neutral-400 mb-6 max-w-sm">
          Enviamos um link de confirmação para <strong className="text-neutral-200">{registeredEmail}</strong>. 
          Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
        </p>
        <Link href="/signin" className="w-full">
          <Button fullWidth className="bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-md cursor-pointer flex items-center justify-center">
            Voltar para o Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="card flex flex-col p-6 md:p-8 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl">
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Criar Conta</h1>
        <p className="text-sm text-neutral-400">
          Insira seus dados para começar no WorkMate
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
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5" htmlFor="password">
            <Lock className="w-3.5 h-3.5" />
            Senha
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Crie uma senha forte"
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
          
          {/* Indicador visual de requisitos da senha */}
          <div className="pt-2 pb-1 space-y-1.5">
            <p className="text-[11px] font-medium text-neutral-400">Requisitos da senha:</p>
            <div className="grid grid-cols-1 gap-1">
              {requirements.map((req, i) => {
                const isValid = req.test(passwordValue);
                return (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    {isValid ? (
                      <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    )}
                    <span className={isValid ? "text-green-400" : "text-neutral-400"}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Campo Confirmar Senha */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5" htmlFor="confirmPassword">
            <Lock className="w-3.5 h-3.5" />
            Confirmar Senha
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Digite a senha novamente"
              disabled={isLoading}
              hasError={!!errors.confirmPassword}
              {...register("confirmPassword")}
              className="bg-neutral-950/50 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 h-11 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Botão de Submit */}
        <Button
          type="submit"
          isLoading={isLoading}
          fullWidth
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-md flex items-center justify-center cursor-pointer mt-6"
        >
          Cadastrar
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-neutral-400">
        Já tem uma conta?{" "}
        <Link href="/signin" className="text-blue-500 hover:underline font-medium">
          Entrar
        </Link>
      </div>
    </div>
  );
}
