# Empty Component Guide

The `Empty` component is a compound primitive used to display empty states, "no results" found, or initial placeholder states.

## Basic Usage (Compound Components)

For maximum flexibility, use the compound components:

```tsx
import { 
  Empty, 
  EmptyHeader, 
  EmptyMedia, 
  EmptyTitle, 
  EmptyDescription 
} from "@/components/ui/empty";
import { BookOpen } from "lucide-react";

<Empty className="py-20">
  <EmptyHeader>
    <EmptyMedia variant="icon">
      <BookOpen className="size-6" />
    </EmptyMedia>
    <EmptyTitle>No items found</EmptyTitle>
    <EmptyDescription>
      Try adjusting your filters or creating a new item.
    </EmptyDescription>
  </EmptyHeader>
</Empty>
```

## Specialized Usage (EmptyResults)

Use `EmptyResults` for standard search/filter results. Note: Ensure translations for `EmptyResults` are available in your `messages/*.json` files.

```tsx
import { EmptyResults } from "@/components/ui/empty";

<EmptyResults 
  searchQuery={searchQuery} 
  title="Custom Title" 
  description="Custom Description"
/>
```

## Available Components

| Component | Description | Props |
|-----------|-------------|-------|
| `Empty` | Root container | `className`, standard div props |
| `EmptyHeader` | Vertical stack for media and text | `className` |
| `EmptyMedia` | Container for icons or illustrations | `variant="default | icon"` |
| `EmptyTitle` | Large title text | `className` |
| `EmptyDescription`| Muted descriptive text | `className` |
| `EmptyContent` | Container for secondary content (actions, buttons) | `className` |
| `EmptyResults` | Pre-built search result handler | `searchQuery`, `title`, `description` |
