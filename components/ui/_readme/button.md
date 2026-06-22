# Button Component Guide

The `Button` component is a high-performance, PWA-aware interactive primitive with built-in loading states, icons, and native-like haptics/animations.

## Basic Usage

```tsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

<Button 
  variant="default" 
  onClick={() => console.log("Clicked")}
  leftIcon={<Plus />}
>
  Click Me
</Button>
```

## Loading States

The `Button` handles loading states automatically, showing a spinner and disabling interactions.

```tsx
<Button isLoading>
  Saving...
</Button>
```

## Variants & Sizes

| Variant | Description |
|-----------|-------------|
| `default` | Primary action (Brand color) |
| `outline` | Secondary action with border |
| `secondary`| Subtle background |
| `ghost` | Transparent background, text only |
| `destructive`| Warning/Danger actions |
| `link` | Underlined text behavior |

| Size | Height | Usage |
|-----------|-------------|-------|
| `xs` | 28px | Micro actions |
| `sm` | 32px | Dense UI |
| `default` | 40px | Standard forms/actions |
| `lg` | 48px | Hero/Marketing CTA |
| `icon` | 40x40px | Square button for icons |

## PWA Features

The button includes specialized behavior for PWA:
- **Android**: Displays a material-style ripple effect on tap.
- **iOS**: Uses a scale-down animation (`active:scale-[0.96]`) for a native-like feel.
- **Touch Targets**: Automatically includes an invisible 44px hit area expansion (`after:`) to comply with accessibility standards.

## Available Props

| Prop | Type | Description |
|-----------|-------------|-------|
| `variant` | `string` | Component style variant |
| `size` | `string` | Component size |
| `isLoading`| `boolean` | Shows spinner and disables button |
| `leftIcon` | `ReactNode` | Icon rendered before text |
| `rightIcon`| `ReactNode` | Icon rendered after text |
| `animation`| `scale | bounce | pulse | none` | Hover/Active animation type |
| `fullWidth`| `boolean` | Makes button 100% width |
