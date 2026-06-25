import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans p-6 text-center dark:bg-black">
      <div className="flex flex-col items-center max-w-md gap-6 border border-border bg-card p-8 rounded-2xl shadow-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive animate-pulse">
          <WifiOff className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sem conexão com a internet
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Parece que você está offline no momento. O conteúdo que você já visitou e suas alterações locais estão salvos, mas para acessar recursos online reconecte-se.
          </p>
        </div>
        <div className="flex w-full flex-col sm:flex-row gap-3 pt-2">
          <Link href="/hub" className="flex-1 w-full">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Ir para o Painel
            </Button>
          </Link>
          <a href="." className="flex-1 w-full">
            <Button variant="default" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/95">
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
