# 📦 WorkMate - Dependências e Ecossistema (`package.md`)

Este documento mapeia os pacotes instalados no projeto, organizados por sua função na arquitetura.

## ⚛️ Core (Framework & React)

A base da aplicação, focada em React 19 e Next.js 16 (App Router).

- **`next`** (`16.0.10`): Framework principal.
- **`react`** & **`react-dom`** (`^19.2.1`): Biblioteca de interface.
- **`next-intl`**: Internacionalização (Multi-idioma).
- **`next-themes`**: Gerenciamento de modo Light/Dark/Temas.
- **`swr`**: Hook para data-fetching e cache reativo no lado do cliente.

## 🎨 UI, Estilização e Acessibilidade (Shadcn + Radix)

O motor visual do sistema. Mobile-first e focado em acessibilidade.

- **`@radix-ui/react-*`**: Primitivas de acessibilidade sem estilo (Dialog, Popover, Select, etc).
- **`lucide-react`**: Biblioteca oficial de ícones.
- **`framer-motion`** & **`motion`**: Animações fluidas (< 200ms).
- **`vaul`**: Drawer otimizado para mobile e PWA (gavetas de baixo para cima).
- **`embla-carousel-react`**: Carrossel leve para exibir cursos/cards.
- **`recharts`**: Gráficos para dashboards de administradores e progresso de alunos.
- **`tailwind-merge`**, **`clsx`**, **`class-variance-authority`**: Utilitários para mesclar classes dinâmicas do Tailwind em componentes Shadcn.
- **`cmdk`**: Paleta de comandos (Command/Ctrl + K).
- **`shadcn`**: CLI do Shadcn UI.

## 📝 Editor Colaborativo (Tiptap + Yjs)

Responsável pelos "Cadernos" colaborativos em tempo real.

- **`@tiptap/react`**, **`@tiptap/pm`**, **`@tiptap/starter-kit`**: Core do editor de texto rico.
- **`@tiptap/extension-*`**: Extensões de formatação (cores, tabelas, tarefas, imagens).
- **`yjs`**: Algoritmo CRDT para resolução de conflitos em tempo real.
- **`@gmcfall/yjs-firestore-provider`**: Sincronização do Yjs via Firebase.
- **`prosemirror-state`**: Gerenciamento de estado interno do Tiptap.

## 🔐 Autenticação e Segurança

Controle de acesso e sanitização de dados.

- **`firebase`**: SDK Frontend (Login, Google Provider).
- **`firebase-admin`**: SDK Backend (Validação de tokens em Server Actions).
- **`zod`**: Validação estrita de fronteira (Inputs e Banco de Dados).
- **`isomorphic-dompurify`**: Sanitização contra XSS (crucial para o HTML/JSON do Tiptap).
- **`otplib`** & **`qrcode.react`**: Geração e validação de tokens 2FA (Autenticador do Google).

## 🔌 Integrações Externas (APIs)

Comunicação com o mundo real (Pagamentos, Vídeo, IA).

- **`abacatepay-nodejs-sdk`**: Gateway de pagamentos (Mensalidades PIX/Cartão).
- **`@stream-io/video-react-sdk`** & **`@stream-io/node-sdk`**: Infraestrutura de Aulas ao Vivo (Vídeo).
- **`stream-chat-react`**: Infraestrutura de mensagens/chat interno.
- **`@google/generative-ai`**: Integração com Gemini (IA para roadmap e correção de exercícios).
- **`googleapis`**: Integração direta com Google Calendar/Drive.

## 📱 PWA & Comunicação (Email/Push)

- **`@ducanh2912/next-pwa`**: Configuração de Service Workers para offline e cache agressivo.
- **`web-push`**: Disparo de notificações em background para celulares.
- **`resend`**: Disparo de emails transacionais.
- **`@react-email/components`**: Construção de templates de e-mail com React.
- **`nodemailer`**: Fallback/SMTP para envio de emails.

## 🛠️ Utilitários & Helpers

- **`date-fns`**: Manipulação de datas e fusos horários.
- **`lodash`**: Funções utilitárias.
- **`uuid`**: Geração de identificadores únicos.
- **`jspdf`**: Geração de contratos/certificados em PDF no cliente.
- **`react-markdown`** & **`remark-gfm`**: Renderização de Markdown.
- **`@dnd-kit/*`**: Funcionalidade de arrastar e soltar (Drag & Drop) para organização de módulos de cursos.
- **`react-hotkeys-hook`**: Atalhos de teclado personalizados.
- **`emoji-picker-react`**: Seletor de emojis.
- **`franc-min`**: Detecção de idioma (útil para ferramentas de correção de texto).

## 🏗️ DevDependencies (Build & Linting)

- **`typescript`** & **`@types/*`**: Tipagem estática end-to-end.
- **`tailwindcss`**, **`@tailwindcss/postcss`**: Framework CSS v4.
- **`sass`**: Suporte a pré-processador CSS (se necessário para componentes legados).
- **`eslint`** & **`eslint-config-next`**: Padronização e qualidade de código.
