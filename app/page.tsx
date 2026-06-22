import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          My Notes
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Um app simples para anotações
        </p>
        <Link href="/signin">
          <Button variant="default" size="lg">
            Começar
          </Button>
        </Link>
      </div>
      <Link className="hidden" href="/terms">
        <Button variant="link" size="sm">
          Termos de Serviço
        </Button>
      </Link>
      <Link className="hidden" href="/privacy">
        <Button variant="link" size="sm">
          Política de Privacidade
        </Button>
      </Link>
    </div>
  );
}
