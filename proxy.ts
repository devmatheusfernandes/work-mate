import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Inicializa o cliente Supabase no ambiente de Edge (Proxy/Middleware)
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Obtém o usuário de forma segura. Isso valida e atualiza os tokens nos cookies automaticamente.
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // Proteção: Redireciona usuários deslogados tentando acessar o painel (/hub/*)
  if (url.pathname.startsWith("/hub")) {
    if (!user) {
      url.pathname = "/signin";
      return NextResponse.redirect(url);
    }
  }

  // Redireciona usuários já autenticados tentando acessar telas de autenticação (/signin, /signup)
  if (url.pathname === "/signin" || url.pathname === "/signup") {
    if (user) {
      url.pathname = "/hub";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

// Executa o proxy apenas nas rotas do painel e telas de autenticação
export const config = {
  matcher: ["/hub/:path*", "/signin", "/signup"],
};
