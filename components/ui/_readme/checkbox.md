# Checkbox Component Guide

The `Checkbox` component is a high-fidelity, animated interactive primitive built with GSAP for smooth transitions and high-end visual feedback. It supports both controlled and uncontrolled states.

## Basic Usage

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox 
  id="terms" 
  onCheckedChange={(checked) => console.log(checked)} 
/>
```

## Integration with React Hook Form

> [!IMPORTANT]
> Because the `Checkbox` uses GSAP animations tied to the `checked` prop, you **MUST** use the `Controller` component from React Hook Form. Using the `register` spread directly will result in missing animations and incorrect visual states.

```tsx
import { Controller, useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

const { control } = useForm();

<Controller
  name="rememberMe"
  control={control}
  render={({ field }) => (
    <Checkbox
      id="rememberMe"
      checked={field.value}
      onCheckedChange={field.onChange}
    />
  )}
/>
```

## Props Reference

| Prop | Type | Description |
|-----------|-------------|-------|
| `id` | `string` | Unique identifier for label association. |
| `checked` | `boolean` | Controlled state. Triggers GSAP animations when changed. |
| `onCheckedChange` | `(checked: boolean) => void` | Callback fired when the value changes. |
| `defaultChecked` | `boolean` | Initial state for uncontrolled usage. |
| `disabled` | `boolean` | Disables interactions and reduces opacity. |
| `className` | `string` | Additional classes for the wrapper container. |

## Technical Details

- **Animations**: Uses GSAP timelines for high-performance, elastic animations (Check and Uncheck).
- **Styling**: Uses the project's design system with `oklch` variables (`--primary`, `--border`). 
- **Accessibility**: Renders a hidden native `input[type="checkbox"]` to maintain keyboard navigation and screen reader support.
- **Visuals**: Features a custom SVG checkmark for a premium feel.
