import { Header } from "@/components/layout/header";
import { Mail, Shield, Briefcase, Calendar } from "lucide-react";
import { getCurrentUser } from "@/lib/safe-action";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/signin");
    }

    const initials = (user.name || "Membro")
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <div>
            <Header title="Meu Perfil" showSubHeader={false} user={user} />
            <main className="container flex justify-center items-start pt-6">
                <div className="card p-6 md:p-8 w-full max-w-lg flex flex-col gap-6">
                    {/* Header profile block with gradients */}
                    <div className="flex flex-col items-center gap-4 text-center border-b border-border/40 pb-6">
                        <div className="h-24 w-24 rounded-full bg-linear-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
                            {initials}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                {user.name}
                            </h2>
                            <div className="inline-flex items-center gap-1.5 self-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                <Shield className="h-3.5 w-3.5" />
                                {user.role}
                            </div>
                        </div>
                    </div>

                    {/* Detailed info lists */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Mail className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex flex-col text-left">
                                <span className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider">E-mail</span>
                                <span className="text-sm font-medium text-foreground">{user.email}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Briefcase className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex flex-col text-left">
                                <span className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider">Departamento</span>
                                <span className="text-sm font-medium text-foreground">Tecnologia & Produto</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Calendar className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex flex-col text-left">
                                <span className="text-xs text-muted-foreground/60 font-semibold uppercase tracking-wider">Conta</span>
                                <span className="text-sm font-medium text-foreground">Sessão Ativa no Supabase</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}