# Skill: Shimmer From Structure (ReactJS)

Este guia detalha as melhores práticas para utilizar a biblioteca **Shimmer From Structure** no ecossistema React, garantindo skeletons precisos e alta performance.

## 📌 Diretrizes Universais de Integração

### 1. Fornecer sempre `templateProps`
O componente Shimmer utiliza o teu componente real para calcular o layout. Para isso, ele precisa de dados mockados.
* **Ação:** Passa um objeto para `templateProps` que espelhe a estrutura exata das props do teu componente.
* **Exemplo:** Se o componente espera um `user`, o template deve ter `{ name: "John Doe", bio: "..." }`.

### 2. Sincronizar Estrutura de Dados
Para evitar o *Layout Shift* (quando o conteúdo "salta" ao carregar), a estrutura do template deve ser idêntica à real.
* **Regra:** Se a tua lista costuma renderizar 5 itens, o teu array de mock em `templateProps` deve conter exatamente 5 itens.

### 3. Decomposição em Shimmers Independentes
Não envolvas toda a página num único componente `<Shimmer>`.
* **Ação:** Divide a UI em blocos lógicos (ex: `SidebarShimmer`, `FeedShimmer`, `NavbarShimmer`).
* **Benefício:** Permite o carregamento progressivo. O utilizador vê partes da interface assim que os dados respetivos chegam, melhorando a performance percebida.

### 4. Dimensões para Conteúdo Assíncrono
Componentes que não têm tamanho definido inicialmente (como imagens com lazy-load ou gráficos que dependem de dados) devem ser envolvidos num container com `width` e `height` explícitos.
* **Porquê:** O Shimmer mede o DOM no momento do mount. Se o elemento tiver altura 0, o skeleton será invisível.

---

## ⚛️ Especificidades do React

### Integração com Suspense
A biblioteca foi desenhada para funcionar perfeitamente com o modelo concorrente do React.
* **Uso:** Podes utilizar o componente Shimmer diretamente dentro da prop `fallback` de um `<Suspense>`.

### Memoização (React.memo)
Para evitar que o motor de medição do Shimmer seja executado desnecessariamente durante re-renders do componente pai:
* **Dica:** Envolve o teu componente de fallback (o que contém o Shimmer) em `React.memo`. Isto garante que a medição ocorra apenas quando o estado de `loading` mudar.

### Sincronização do DOM (useLayoutEffect)
Internamente, a biblioteca utiliza `useLayoutEffect`. Isto é fundamental para o React porque:
1. Mede o layout **antes** do browser pintar no ecrã.
2. Evita o *flicker* (aquele breve momento em que vês o componente real sem dados antes do skeleton aparecer).

---

## 🛠️ Atributos de Controlo Fino (HTML Attributes)

Podes controlar o comportamento do Shimmer diretamente no JSX usando atributos `data-`:

| Atributo | Descrição | Caso de Uso |
| :--- | :--- | :--- |
| `data-shimmer-ignore` | O elemento e os seus filhos ficam visíveis e são ignorados na criação do skeleton. | Badges de status, labels estáticos, ícones decorativos. |
| `data-shimmer-no-children` | Trata um elemento complexo (com muitos filhos) como um único bloco retangular de shimmer. | Cards de estatísticas pequenos ou linhas de texto muito fragmentadas. |

---

## ⚡ Considerações de Performance

* **Medição Única:** A medição do layout só é disparada uma vez quando a prop `loading` transita para `true`.
* **Skip de Elementos Ocultos:** Elementos com `display: none` ou dimensões zero são ignorados automaticamente para poupar processamento.
* **APIs Nativas:** Utiliza `ResizeObserver` e `getComputedStyle` para garantir que a sobreposição do skeleton seja leve e eficiente.

## 💻 Exemplo de Implementação Base

```tsx
import { Suspense } from 'react';
import { Shimmer } from '@shimmer-from-structure/react';
import { UserProfile } from './UserProfile';

// 1. Defina as props mockadas
const mockUser = {
  name: "Carregando...",
  avatarUrl: "",
  bio: "Carregando a biografia do usuário..."
};

export function ProfileSection({ isLoading, userData }) {
  return (
    // 2. Envolva o componente com o Shimmer
    <Shimmer loading={isLoading} templateProps={{ user: mockUser }}>
      <UserProfile user={userData} />
    </Shimmer>
  );
}