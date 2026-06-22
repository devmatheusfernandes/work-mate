# Stepper

Um componente de progresso por etapas com suporte a orientação horizontal e vertical, scroll nativo no mobile, animações com Framer Motion e total compatibilidade com light/dark mode.

---

## Uso básico

```tsx
import { Stepper } from "@/components/ui/stepper";

const steps = [
  { id: 1, title: "Conta", subtitle: "Crie seu acesso" },
  { id: 2, title: "Perfil", subtitle: "Sobre você" },
  { id: 3, title: "Revisão", subtitle: "Confirme tudo" },
];

export default function Page() {
  const [currentStep, setCurrentStep] = useState(1);

  return <Stepper steps={steps} currentStep={currentStep} />;
}
```

---

## Props

| Prop          | Tipo                         | Padrão         | Descrição                       |
| ------------- | ---------------------------- | -------------- | ------------------------------- |
| `steps`       | `Step[]`                     | —              | Array de passos. Obrigatório.   |
| `currentStep` | `number`                     | —              | ID do passo ativo. Obrigatório. |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Direção do stepper.             |
| `variant`     | `"default" \| "sidebar"`     | `"default"`    | Visual compacto para sidebars.  |
| `className`   | `string`                     | `""`           | Classes extras no wrapper.      |

### Tipo `Step`

```ts
interface Step {
  id: number; // Identificador único e sequencial (1, 2, 3…)
  title: string; // Nome curto do passo
  subtitle?: string; // Descrição opcional (ignorada na variante sidebar)
}
```

---

## Variantes

### Horizontal (padrão)

Ideal para formulários multi-etapas no topo da página. No mobile, ativa scroll horizontal com snap automático e dots indicadores.

```tsx
<Stepper steps={steps} currentStep={2} orientation="horizontal" />
```

### Vertical

Indicado para fluxos laterais, wizards longos ou quando há subtítulos extensos.

```tsx
<Stepper steps={steps} currentStep={2} orientation="vertical" />
```

### Sidebar

Versão compacta sem subtítulos, pensada para painéis laterais e dashboards.

```tsx
<Stepper
  steps={steps}
  currentStep={2}
  orientation="vertical"
  variant="sidebar"
/>
```

---

## Controle de estado

O `Stepper` é um componente **controlado** — ele não gerencia estado internamente. Toda a lógica de avanço e retrocesso fica no seu componente pai.

### Com `useState`

```tsx
const [step, setStep] = useState(1);

const next = () => setStep((s) => Math.min(s + 1, steps.length));
const prev = () => setStep((s) => Math.max(s - 1, 1));

<Stepper steps={steps} currentStep={step} />

<div className="flex gap-2 mt-6">
  <button onClick={prev} disabled={step === 1}>Voltar</button>
  <button onClick={next} disabled={step === steps.length}>Avançar</button>
</div>
```

### Com validação por passo

```tsx
const [step, setStep] = useState(1);
const [errors, setErrors] = useState({});

const handleNext = async () => {
  const valid = await validateCurrentStep(step);
  if (!valid) return;
  setStep((s) => s + 1);
};

<Stepper steps={steps} currentStep={step} />;
```

### Com React Hook Form

```tsx
const methods = useForm();

const onNext = methods.handleSubmit(() => {
  setStep((s) => s + 1);
});

<FormProvider {...methods}>
  <Stepper steps={steps} currentStep={step} />
  <StepContent step={step} />
  <button onClick={onNext}>Avançar</button>
</FormProvider>;
```

---

## Comportamento mobile

No modo `horizontal`, o componente detecta telas pequenas e ativa automaticamente:

- **Scroll horizontal nativo** com `scroll-snap` por item
- **Auto-scroll suave** para o passo ativo ao trocar `currentStep`
- **Fades laterais** indicando que há mais itens para rolar
- **Dots indicadores** que refletem tanto o `currentStep` quanto a posição do scroll manual

Nenhuma configuração extra é necessária — tudo acontece via Tailwind com breakpoint `sm:`.

---

## Exemplos avançados

### Formulário multi-etapas completo

```tsx
const STEPS = [
  { id: 1, title: "Dados", subtitle: "Informações pessoais" },
  { id: 2, title: "Endereço", subtitle: "Onde você mora" },
  { id: 3, title: "Pagamento", subtitle: "Forma de cobrança" },
  { id: 4, title: "Revisão", subtitle: "Confirme e envie" },
];

const STEP_COMPONENTS = {
  1: <PersonalDataForm />,
  2: <AddressForm />,
  3: <PaymentForm />,
  4: <ReviewSummary />,
};

export function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const isFirst = currentStep === 1;
  const isLast = currentStep === STEPS.length;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Stepper steps={STEPS} currentStep={currentStep} className="mb-10" />

      <div className="min-h-[300px]">
        {STEP_COMPONENTS[currentStep as keyof typeof STEP_COMPONENTS]}
      </div>

      <div className="flex justify-between mt-8 pt-6 border-t">
        <button
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={isFirst}
          className="px-4 py-2 rounded-md border disabled:opacity-40"
        >
          Voltar
        </button>
        <button
          onClick={() =>
            isLast ? handleSubmit() : setCurrentStep((s) => s + 1)
          }
          className="px-4 py-2 rounded-md bg-foreground text-background"
        >
          {isLast ? "Confirmar" : "Avançar"}
        </button>
      </div>
    </div>
  );
}
```

### Sidebar com layout dividido

```tsx
export function DashboardLayout() {
  const [step, setStep] = useState(1);

  return (
    <div className="flex gap-8">
      <aside className="w-52 shrink-0 p-4 rounded-md bg-muted">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
          Configuração
        </p>
        <Stepper
          steps={STEPS}
          currentStep={step}
          orientation="vertical"
          variant="sidebar"
        />
      </aside>

      <main className="flex-1">
        <StepContent step={step} />
      </main>
    </div>
  );
}
```

### Com animação de conteúdo entre passos

```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}
    initial={{ opacity: 0, x: 16 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -16 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
  >
    {STEP_COMPONENTS[currentStep]}
  </motion.div>
</AnimatePresence>;
```

---

## Boas práticas

### IDs sempre sequenciais a partir de 1

O componente usa `id` para comparar com `currentStep` e calcular quais passos estão completos. IDs fora de ordem quebram a lógica das linhas de progresso.

```tsx
// ✅ correto
const steps = [{ id: 1 }, { id: 2 }, { id: 3 }];

// ❌ evite
const steps = [{ id: 0 }, { id: 1 }, { id: 2 }];
const steps = [{ id: 10 }, { id: 20 }, { id: 30 }];
```

### Títulos curtos, subtítulos opcionais

Titles longos quebram o layout horizontal, especialmente no mobile. Use o `subtitle` para detalhar.

```tsx
// ✅ correto
{ title: "Pagamento", subtitle: "Cartão ou boleto" }

// ❌ evite
{ title: "Escolha a forma de pagamento preferida" }
```

### Não pule passos programaticamente

Avançar de 1 para 3 sem passar pelo 2 faz com que os passos intermediários apareçam como completos sem ter sido visitados. Se quiser passos opcionais, modele-os como tal na sua lógica de negócio.

```tsx
// ✅ avance sempre um passo por vez
setStep((s) => s + 1);

// ❌ evite saltos
setStep(4);
```

### Limite de passos por orientação

Para manter a legibilidade:

- **Horizontal**: até 5 passos. Com 6 ou mais, prefira o vertical.
- **Vertical / sidebar**: sem limite prático, mas agrupe etapas longas em seções quando passar de 8.

### Não bloqueie o avanço silenciosamente

Se houver validação, mostre o erro antes de impedir o avanço. O usuário precisa entender por que não pode prosseguir.

```tsx
const handleNext = async () => {
  const result = await validate();
  if (!result.valid) {
    toast.error(result.message); // feedback visível
    return;
  }
  setStep((s) => s + 1);
};
```

### Persista o passo em fluxos longos

Em formulários que o usuário pode abandonar e retomar, salve o `currentStep` no `localStorage` ou na URL.

```tsx
// via URL (recomendado — permite compartilhar e voltar)
const [step, setStep] = useQueryState("step", parseAsInteger.withDefault(1));

// via localStorage (simples, sem dependência extra)
const [step, setStep] = useState(() => {
  return Number(localStorage.getItem("form-step") ?? 1);
});

useEffect(() => {
  localStorage.setItem("form-step", String(step));
}, [step]);
```

---
