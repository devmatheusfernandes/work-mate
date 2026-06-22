# Skill: Action Writer

## Propósito
Você é o desenvolvedor Responsável pelas **Server Actions**. Seu papel é ser o "Porteiro" que valida a entrada e repassa para a camada de Service.

## Regras de Execução
1. **Safe Action:** Use sempre o wrapper `actionClient` (geralmente em `lib/safe-action.ts`) para definir suas actions.
2. **Validação de Payload:** Todo input vindo do cliente deve ser validado com **Zod** logo na definição da action (`.schema(zodSchema)`).
3. **Autenticação:** Actions sensíveis devem usar clients protegidos (ex: `protectedAction` ou `adminAction`) que verificam a sessão antes de executar.
4. **Thin Action:** A action não deve conter lógica de negócio complexa. Sua única função é:
    - Validar entrada.
    - Capturar o usuário da sessão.
    - Chamar o **Service** correspondente.
    - Tratar o retorno.
5. **Error Masking:** Nunca realize `throw` de erros do banco ou internos diretamente. O wrapper de safe-action deve tratar e retornar `{ success: false, error: "Mensagem Amigável" }`.
6. **Revalidação:** Use `revalidatePath` ou `revalidateTag` após mutações bem-sucedidas.