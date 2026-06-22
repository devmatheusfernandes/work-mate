# Wizard Component Guide

The `Wizard` component is a multi-step form container built on top of the `Vault`. It features smooth transitions and progress tracking.

## Basic Usage

```tsx
import { Wizard } from "@/components/ui/wizard";
import { User, CreditCard } from "lucide-react";

const steps = [
  {
    id: "step1",
    title: "Basic Info",
    description: "Tell us about yourself",
    icon: User,
    content: <PersonalInfoForm />,
    headerBg: "bg-blue-100", // Optional background for step icon
  },
  {
    id: "step2",
    title: "Payment",
    icon: CreditCard,
    content: <PaymentDetails />,
  }
];

<Wizard 
  open={isOpen} 
  onOpenChange={setIsOpen} 
  steps={steps}
  onComplete={() => console.log("Finished!")}
  submitLabel="Finalize"
/>
```

## Features

- **Animated Transitions**: Uses Framer Motion for hardware-accelerated slide and blur effects between steps.
- **Progress Bar**: Automatically renders a dots-style progress indicator at the bottom.
- **Auto-Reset**: Resets to the first step when closed (with a small delay to prevent visual flicker during closing animation).
- **Icon Header**: Each step can have a unique icon and background color defined in the `steps` array.

## Props

| Prop | Type | Description |
|-----------|-------------|-------|
| `open` | `boolean` | Control visibility |
| `onOpenChange` | `(open: boolean) => void` | Visibility callback |
| `steps` | `WizardStep[]` | Array of step definitions |
| `onComplete` | `() => void` | Called after clicking "submit" on the last step |
| `submitLabel` | `string` | Text for the last button (default: "Concluir") |

## Step Definition Interface

```tsx
interface WizardStep {
    id: string;
    title: string;
    description?: string;
    icon?: React.ElementType;
    content: React.ReactNode;
    headerBg?: string; // Tailwind class for the header circle background
    iconColor?: string; // Tailwind class for the icon color
}
```
