---
trigger: always_on
---

# DESIGN SYSTEM & UI/UX RULES (WorkMate)

## 1. Princípios Básicos

- **Mobile-First Real:** Programe sempre a versão mobile primeiro (`className="flex flex-col md:flex-row"`) use touch targets >= 44x44px.
- **Espaçamento e Tipografia:** Use o sistema de 8px (Tailwind `p-2`, `m-4`, `gap-4`). Use fontes e cores baseadas no Tailwind e na configuração global do `theme`.
- **Nunca use shadow nos componentes**
- **Sempre verifique a pasta @components/ui/\_readme para ver como usar os componentes**

## 2. Componentes Adaptativos (Regra de Ouro)

### Responsive Behavior

- **Dropdowns:** (Já existe em components/ui/dropdown-menu)
- **Dialogs/Alerts/Confirmation:** Always Vault. (Já existe em components/ui/vault)
- **Forms:** ShadCN + ReactHookForm, sempre verifique @docs/patterns/safe-action-forms.md. (Use especialmente @components/ui/input, @components/ui/select e @components/ui/field)

### Search UX (@components/ui/search-input)

- Always include empty (@components/ui/empty) states components when using it.

### Header Component (Verifique @components/layout/\_readme/header.md)

### Theming

- Multi-theme-colors support
- Light/dark modes

## 3. Interação e Feedback

- Todo botão ou link DEVE ter um estado de _loading_ claro (spinner) durante mutações via Server Actions.

- **Shimmer Skeleton:** Para fetching de dados (SWR ou carregamento inicial no Client), use SEMPRE a técnica de **Shimmer From Structure**. Veja @/.agents/skills/shimmer-skeleton.md para guidelines de implementação (templateProps, sincronização de estrutura).
- Animações (Framer Motion) devem ser curtas (< 200ms) e objetivas, evitando exageros visuais. (Verifique @lib/animations.ts)
- Sempre mostre um Toast (`sonner`) após o retorno de uma Server Action (sucesso ou erro).

## 4. Empty States e Tratamento de Erros

- Nenhuma tela deve ficar em branco se não houver dados, principalmente em buscas ou páginas que deviam mostrar dados. Sempre exiba um componente `<EmptyState />` com ícone, mensagem amigável e um CTA (Call to Action).

## 5. Estrutura de Página e Cards

- **Estrutura de Rota (page.tsx):**
  - O elemento raiz deve ser uma `div` sem classes.
  - O conteúdo principal deve ser encapsulado em uma tag `<main>` com a classe `container`.
  - Use o componente `<Header />` (se necessário) antes do `<main>`.
- **Estilo de Containers (Sem Shadcn Card):**
  - **NUNCA** use os componentes `Card`, `CardHeader`, `CardTitle` ou `CardContent` do Shadcn.
  - Para containers de seção, use `<div className="card ...">`.
  - Para itens de lista ou cartões repetíveis, use `<div className="item ...">`.
  - Estes estilos (definidos em `globals.css`) garantem a consistência visual, ausência de sombras e o comportamento correto de hover/dark mode do projeto.
