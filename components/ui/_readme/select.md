# Select Component Guide

The `Select` component is a high-fidelity, adaptive dropdown selector built on top of Radix UI. It is designed to follow the project's standard for accessibility, performance, and PWA-readiness.

## Key Features

- **Adaptive Design**: Automatically switches from a standard dropdown (Desktop) to a "Floaty" bottom sheet (`Vault`) on mobile devices.
- **Accessibility**: Full Radix UI keyboard navigation and screen reader support.
- **Integrated Vault**: Uses the project's `Vault` component for mobile overlays, ensuring consistency with other modals and drawers.
- **Form Integration**: Works seamlessly with `react-hook-form` via the `Controller` component.

## Basic Usage

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select defaultValue="en">
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Language" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="en">English</SelectItem>
    <SelectItem value="es">Spanish</SelectItem>
    <SelectItem value="fr">French</SelectItem>
  </SelectContent>
</Select>
```

## Form Integration (React Hook Form)

Since `Select` is a controlled component, it must be integrated using the `Controller` component from `react-hook-form`.

```tsx
import { Controller, useForm } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const { control } = useForm();

<Controller
  name="language"
  control={control}
  render={({ field }) => (
    <Select onValueChange={field.onChange} value={field.value}>
      <SelectTrigger>
        <SelectValue placeholder="Select a language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="pt">Portuguese</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

## Specialized Components

- **SelectGroup**: Groups related items with optional label.
- **SelectLabel**: Heading for a group of items.
- **SelectSeparator**: Visual divider between items.
- **SelectScrollUpButton / SelectScrollDownButton**: Custom scroll indicators (internal use).

## Adaptive Behavior

The `Select` component uses the `useIsMobile` hook to determine the rendering strategy:
- **Desktop**: Renders `SelectPrimitive.Content` (Radix) with portal support.
- **Mobile/PWA**: Renders `VaultContent` with a fixed height and scrollable list, following the "Floaty" design system.

## Best Practices

1. **Placeholder**: Always provide a clear `placeholder` to `SelectValue`.
2. **Width**: Use `className` on `SelectTrigger` to set the width (e.g., `w-full` or `w-[200px]`).
3. **Validation**: Use `Field` (from `@/components/ui/field`) to wrap the `Select` and show labels or error messages.
