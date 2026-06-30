# Popover UI Component

O componente `Popover` da WorkMate é construído sobre o `@base-ui/react/popover`.

## ⚠️ Limitações do PopoverTrigger

Diferente de alguns outros componentes do Radix, o `PopoverTrigger` do Base UI **NÃO** suporta a propriedade `asChild`.

### Como Resolver

Se você precisar que o trigger seja um componente customizado, você deve:

1. **Passar as props diretamente**: O `PopoverTrigger` renderiza um `<button>` por padrão. Se você quiser que ele se comporte como outro elemento, você deve envolvê-lo ou usar a propriedade `render` do Base UI (se disponível) ou simplesmente usar o componente dentro dele sem `asChild`.

2. **Evitar `asChild`**: Se você tentar usar `asChild={true}`, receberá um erro de tipagem pois a propriedade não existe no `PopoverTrigger`.

```tsx
// INCORRETO ❌
<PopoverTrigger asChild>
  <Button>Abrir</Button>
</PopoverTrigger>

// CORRETO ✅
<PopoverTrigger>
  Abrir
</PopoverTrigger>

// Se precisar de estilo de botão, use o buttonVariants do shadcn no trigger diretamente se possível,
// ou simplesmente aceite que o trigger já é um botão.
```

## 🚀 Padrão "Vault-First"

**IMPORTANTE:** Para seletores de data (Calendar), a WorkMate agora exige o uso de **Vaults** em vez de **Popovers**.

Use o componente `CalendarVault` em vez de envolver um `Calendar` em um `Popover`. Isso evita problemas de z-index e "click-through" em interfaces mobile e modais aninhados.
