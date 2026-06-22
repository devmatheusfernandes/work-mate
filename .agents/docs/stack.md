# 🏗️ FluencyLab School: Architecture & Tech Stack Blueprint (Enterprise Security Edition)
**Pragmatic Domain-Driven Design & Spec-Driven Development**

---

## 1. Core & Infrastructure
* **Framework:** Next.js (App Router)
* **Hosting:** Vercel
* **PWA Paradigm:** Mobile-first, offline-capable via Service Workers
    > *Obs: Next.js 16 requires Webpack for production builds to enable offline support. Turbopack is used only in development.*
* **Background Jobs:** GitHub Actions (cron jobs for reminders and payments notifications, cleanup)
* **Internationalization:** NextJS w/ i18n to make the website multilingual (Always use a fallback)
* **Environment Validation:** Use `@t3-oss/env-nextjs` to strictly type and validate the `.env` file at build and runtime. The server must fail to start if variables are missing or invalid.
* **Security Headers:** Configurados via `next.config.mjs` (CSP rigoroso, `X-Frame-Options: DENY`, `Strict-Transport-Security`, mitigando XSS e Clickjacking).
* **Dependency Security:** GitHub Actions com rodadas automáticas de `npm audit` / `Snyk` para bloquear deploys com pacotes vulneráveis.

## 2. Database & ORM (Separation of Responsibilities)

### Primary Database (Relational)
* **Provider:** Neon (Serverless PostgreSQL)
* **Extensions:** `pgvector` enabled natively
* **Responsibilities:**
    * Users
    * Profiles
    * Classes
    * Scheduling *(We schedule based on the amount of classes the student needs and the slots available of a given teacher)*
    * Study Plans
    * Study Lessons
    * Study Items *(Study Items are formed by LearningItems and LearningStructures, those form Lessons with the content class and those form Plans)*
    * Announcements (Notifications)
    * Teacher Vacation
    * Podcasts
    * Blogs
    * Placement (Results and Tests)
    * Financial data (Monthly Payments, Credit use)
    * Tasks 
    * School Information
    * RAG embeddings of Study Lessons
    * **Audit Logs** *(Track critical system changes)*
* ** Row-Level Security (RLS) & Defense in Depth:** Implementação de Policies no Postgres (ex: `USING (id = current_user_id)`). Mesmo que o backend tenha a chave Master, o RLS atua como uma barreira final contra bugs em queries que poderiam vazar dados de outros alunos.

### Realtime Database
* **Provider:** Firebase Realtime Database
* **Responsibilities:** Real-time collaboration via Yjs (Tiptap). *Note: Tiptap data is stored as JSON (AST) to mitigate injection risks.*

### ORM
* **Tool:** Drizzle ORM (`drizzle-orm/pg-core`)
* **Decisions:**
    * Drizzle is the single source of truth.
    * Zod schemas are generated from Drizzle using `drizzle-zod`.
* **Approach:**
    * SQL-like queries.
    * End-to-end type safety *(Especially because we’ll use TypeScript)*.
    * Controlled migrations (local → Neon).

## 3. Authentication, Security & Auditing

### Authentication & Session Management
* **Provider:** Firebase Authentication
    > *Obs: Firebase UID is saved in Neon inside the ‘users’ table.*
* **Responsibilities:**
    * Login *(We’ll also have Google as a Provider)*
    * Registration *(Users never register themselves, we send a welcome mail the users access the create password page but they can choose between password and Google Provider)*
    * Password recovery
    * 2FA
* ** Session Hardening:** * Tokens validados a cada Request Sensível no servidor usando `firebase-admin`.
    * Cookies configurados com `HttpOnly`, `Secure` e `SameSite=Strict` (previne CSRF nativamente junto com as defesas padrão das Server Actions do Next.js).
    * Invalidação forçada de sessão no backend após troca de senha ou deleção de conta.

### Boundary Validation & Sanitization
* **Library:** Zod
* **Rule:** Every external input must be validated (Forms, Server Actions, Webhooks). We need validation on client and server, secure both sides. *(Create `auth-client.ts` and `auth-server.ts`)*.
* **Input Sanitization:** Zod valida o *formato*. O conteúdo rico (como JSON do Tiptap ou inputs longos) passa por sanitização estrita (DOMPurify via `sanitize.ts`) antes da renderização.

### Webhook Security & Idempotency
* **Used for:** AbacatePay webhooks
* **Definition:** HMAC is a cryptographic signature used to verify that a webhook payload is authentic.
* **Flow:** Receive payload + signature → Recompute HMAC using shared secret → Compare signatures. Reject if invalid.
* **Webhook Hardening:**
    * **Replay Protection:** Rejeitar webhooks com timestamps antigos (> 5 minutos).
    * **Idempotência:** Todo evento do AbacatePay é registrado em uma tabela `processed_events`. Se o mesmo ID de pagamento chegar duas vezes, a segunda requisição é ignorada, prevenindo bugs de créditos duplos.

### Access Control (RBAC + ABAC)
* **Roles (RBAC):** `admin`, `teacher`, `student` *(differentiate minor and 18+ students)*, `manager` *(manages students, teacher and material)*.
* **Ownership (ABAC):** RBAC define *o que* você faz. ABAC define *onde*. Exemplo: Uma Action verifica `user.role === 'teacher'` (RBAC) E verifica se `class.teacherId === user.id` (ABAC).
* **Strategy:** Centralized in `rbac.ts`. Enforced at the **Service Layer**, not UI. Client permissions are for UX ONLY.

### 🛡️ Advanced Security Practices
* **Rate Limiting (Upstash Redis):** * Applied to **all** public API Routes (Webhooks, callbacks).
    * Applied to **critical Server Actions** only (Login, Scheduling, Financial mutations, Role changes) combining IP + UserID to prevent spam, brute force, and runaway serverless costs.
    * Limitador de Payload configurado no Next.js para evitar ataques de DoS com arquivos gigantes.
* **File Upload Security:** Verificação real de MIME-Type no servidor (não apenas extensão), limites restritos de tamanho (ex: max 5MB para imagens) e armazenamento em bucket isolado.
* **Audit Logging:**
    * Every destructive action (DELETE) or privilege escalation (changing roles, manual credit overrides) MUST create a record in an `audit_logs` table (Fields: `actor_id`, `action`, `target_id`, `timestamp`).
* **Error Leak Prevention (Error Masking):**
    * **How:** Server Actions MUST wrap database calls in a `try/catch`. 
    * **Rule:** Never return raw database errors (e.g., `error.message` from Drizzle) to the frontend. Log the real error to the server console/logger, and return a standardized safe message to the client: `return { success: false, error: "Ocorreu um erro interno ao processar a solicitação." }`.
* **Operational Logging:** Uso de bibliotecas estruturadas (ex: Pino/Winston/Sentry) para capturar picos de erros 500, falhas seguidas de login e interrupções em integrações externas.

## 4. State Management & Data Fetching

### Mutations (Write Operations)
* **Tool:** Next.js Server Actions
* **Rule:** Client never accesses the database directly.

### API Routes (`/app/api/`)
* **Usage:** Only for external integrations (Webhooks: Resend, AbacatePay, Stream) and third-party callbacks.

### Clear Rule (Server Actions vs API Routes)
* **Server Actions:** Internal operations (frontend → backend), CRUD and business logic.
* **API Routes:** External communication, Public endpoints.

### Data Fetching (Reads)
* **Default:** Server Components (RSC)
* **Client-side:** SWR (selective usage)

### SWR Usage Rule
* **Use SWR only when:** Data changes frequently, UI needs reactive updates, Cache reuse improves UX.
* **Do NOT use SWR when:** Data is static or rarely changes, Server rendering is sufficient.

### PWA Caching & Offline Security
* **Selective caching (not global):**
    * **Aggressive cache:** Non-critical, frequently accessed data.
    * **Stale-while-revalidate:** Scheduling, Read-only financial views, Notebooks, Games.
* ** Offline Security Rules:**
    * Do NOT cache PII (Personally Identifiable Information) or Auth/Sensitive data in IndexedDB.
    * Limpeza obrigatória (`clear()`) de todo o estado local e IndexedDB no momento do Logout.
* **Offline Strategy:** IndexedDB for local persistence. Queue system for offline mutations (retry on reconnect).
* **Client State (UI):** Tool: Zustand. Scope: UI-only state, No business logic.

## 5. User Interface (Frontend)
* **Styling:** TailwindCSS
* **Components:** Shadcn UI
* **Animations:** Framer Motion (< 200ms)
* **Editor:** Tiptap + Yjs + Firebase
* **Icons:** Lucide React
* **Fonts:** `next/font`

### App Router Features
* `loading.tsx`
* `error.tsx`
* `not-found.tsx`
* `offline.tsx`

### PWA Features
* Push notifications (background-enabled)

## 6. Third-Party Integrations
* **Payments:** AbacatePay (HMAC-secured webhooks)
* **Email:** Resend
* **Video:** Stream Video

## 7. Spec-Driven Development – Core Rules

### Schema First
1. Define Drizzle schema first.
2. Generate Zod schema.
3. Then implement logic/UI.

### Strict Boundaries
`Client` → `Server Action` → `Service` → `Repository` → `Database`

## 8. Architecture Rules

### Layer Responsibilities
* **Hooks:** SWR data fetching, UI state helpers, No business logic.
* **Services:** Business rules, Access control (RBAC+ABAC), Orchestration.
* **Repositories:** Pure database queries (Drizzle), No logic.

### Naming Conventions
* `*.service.ts` → business logic
* `*.repository.ts` → database
* `*.schema.ts` → validation
* `*.types.ts` → shared types
* `use*.ts` → hooks

## 9. UI/UX System Rules
*Keep system deterministic and maintainable.*

### Core Rules
* 8px spacing system
* Touch targets ≥ 44x44px
* Animations ≤ 200ms
* Mobile-first interactions

### Responsive Behavior
* **Sidebar:**
    * **Desktop:** Left side Collapsible with icons and SidebarTrigger.
    * **Mobile:** Bottom side Vault with trigger.
* **Dropdowns:**
    * **Desktop:** Default.
    * **Mobile:** Vault.
* **Dialogs/Alerts/Confirmation:** Always Vault.
* **Forms:** ShadCN + ReactHookForm.

### Search UX
* Always include empty states components when using it.

### Header
* **Desktop:** * *Left:* BackButton when in sub-page.
    * *Center:* Title.
    * *Right:* ThemeToggle, Notification and Avatar (Logout and Profile).
    * *Sub-Header:* Subtitle and SearchButton/SearchInput/ActionButton.
* **Tablet:** * *Left:* BackButton when in sub-page.
    * *Center:* Title.
    * *Right:* ThemeToggle, Notification and Avatar (Logout and Profile).
    * *Sub-Header:* Subtitle and SearchButton/SearchInput/ActionButton.
* **Mobile and PWA:** * *Left:* BackButton when in sub-page.
    * *Right:* SearchButton/ActionButton, Avatar Dropdown with: ThemeToggle, Notification, Logout and Profile.
    * *Sub-Header:* Title and subtitle.

### Theming
* Multi-theme-colors support
* Light/dark modes

### Notifications
* Background push (PWA)
* **Toasts:**
    * **Desktop:** Top
    * **Mobile:** Bottom
    * **PWA:** Custom Vault toast

## 10. Agents/Skills
* NextJS Agent
* NeonPostGress Agent
* TipTap Skills
* ReactHooks Skills
* TypeScript Skills

---

## 11. Folder Structure (Enterprise Edition)

```text
fluencylab-school/
├── 📁 app/                    # Next.js App Router (Páginas e APIs Externas)
│   ├── 📁 (auth)/             # Telas de Login/Recuperação (Firebase UI)
│   ├── 📁 (dashboard)/        # Telas logadas (Admin, Teacher, Student)
│   └── 📁 api/                # APENAS Integrações Externas (A Regra de Ouro)
│       ├── 📁 webhooks/       
│       │   └── 📁 abacatepay/route.ts
│       ├── 📁 cron/
│       │   ├── 📁 class-reminders/route.ts
│       │   └── 📁 payments/route.ts
│       └── 📁 push/route.ts   # PWA Push Notifications
│
├── 📁 modules/                # O Coração do Negócio (Pragmatic DDD)
│   ├── 📁 user/               # Identidade e Perfis
│   │   ├── user.actions.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── user.schema.ts     
│   │   └── user.types.ts
│   ├── 📁 class/              # Agendamentos e Aulas
│   ├── 📁 learning/           # Cursos, Lições, Transcrições
│   ├── 📁 srs/                # Gamificação e Repetição Espaçada
│   ├── 📁 finance/            # Pagamentos, Mensalidades e Créditos
│   ├── 📁 notebook/           # Metadados dos Cadernos
│   └── 📁 audit/              # Logs de Auditoria do Sistema
│       ├── audit.repository.ts
│       └── audit.schema.ts
│
├── 📁 hooks/                  # Lógica de UI e SWR
│   ├── 📁 auth/               # useCurrentUser, usePermissions
│   ├── 📁 ui/                 # useMobile, usePWAInstall, useTiptapEditor
│   └── 📁 learning/           # useSrsSession
│
├── 📁 lib/                    # Configurações Globais, Clientes e Segurança
│   ├── db.ts                  # Conexão Drizzle -> Neon
│   ├── firebase-client.ts     # SDK Frontend (Auth, Realtime DB)
│   ├── firebase-admin.ts      # SDK Backend (Validação de sessão)
│   ├── rbac.ts                # Dicionário de Permissões (RBAC + ABAC)
│   ├── rate-limit.ts          # Conexão Upstash Redis (Anti-DoS)
│   ├── logger.ts              # Pino/Sentry para Operational Logging
│   ├── idempotency.ts         # Helpers para Webhooks do AbacatePay
│   ├── safe-action.ts         # Wrapper Next-Safe-Action (Error Masking)
│   ├── auth-server.ts         # Helper de Sessão no Backend
│   └── auth-client.ts         # Helper de Sessão no Frontend
│
├── 📁 components/             # UI Components (Shadcn, Framer Motion)
│   ├── 📁 ui/                 # Botões, Inputs, Vaults (Padrão Shadcn)
│   ├── 📁 layout/             # Header, Sidebar, Vault (PWA)
│   └── 📁 tiptap/             # O Editor colaborativo
│
├── 📁 utils/                  # Funções puras (sem dependências pesadas)
│   ├── date.ts                # Formatação de fusos horários e intervalos
│   ├── format.ts              # Formatação de moeda (R$), nomes, etc.
│   ├── sanitize.ts            # DOMPurify para dados ricos (Tiptap)
│   └── error-handler.ts       # Padronização de erros pro Client
│
├── middleware.ts              # Verificação de Sessão Edge e Security Headers
├── drizzle.config.ts          # Configuração das migrações do banco
├── tailwind.config.ts
├── env.ts                     # Validação Zod estrita para o .env
└── next.config.mjs            # PWA, CSP, Security Headers
```