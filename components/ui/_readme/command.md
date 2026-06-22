# Command Component Guide

The `Command` component is a compound primitive used for command palettes, menu search, and keyboard-driven navigation. It is based on `cmdk` and integrated with the project's `Vault` for dialog states.

## Basic Usage (Compound Components)

For maximum flexibility, use the compound components:

```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Calculator, Calendar, Smile } from "lucide-react";

<Command className="rounded-md border border-gray-200/50 dark:border-gray-700/50">
  <CommandInput placeholder="Type a command or search..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Suggestions">
      <CommandItem>
        <Calendar className="mr-2 h-4 w-4" />
        <span>Calendar</span>
      </CommandItem>
      <CommandItem>
        <Smile className="mr-2 h-4 w-4" />
        <span>Search Emoji</span>
      </CommandItem>
    </CommandGroup>
  </CommandList>
</Command>;
```

## Specialized Usage (CommandDialog)

Use `CommandDialog` when you need a command palette that opens in a modal/vault. It integrates with our `Vault` system for PWA and Mobile consistency.

```tsx
import { CommandDialog } from "@/components/ui/command";

// Inside your component
const [open, setOpen] = useState(false);

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search everything..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="General">
      <CommandItem onSelect={() => console.log("Profile")}>Profile</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>;
```

## Available Components

| Component          | Description                      | Props                               |
| ------------------ | -------------------------------- | ----------------------------------- |
| `Command`          | Root container                   | `className`, standard cmdk props    |
| `CommandDialog`    | Vault-based modal container      | `open`, `onOpenChange`, Vault props |
| `CommandInput`     | Search input with icon           | `className`, placeholder            |
| `CommandList`      | Container for command items      | `className`                         |
| `CommandEmpty`     | State when no results match      | `children`                          |
| `CommandGroup`     | Section with an optional heading | `heading`, `className`              |
| `CommandItem`      | Actionable list item             | `onSelect`, `className`             |
| `CommandShortcut`  | Keyboard shortcut hint           | `className`                         |
| `CommandSeparator` | Visual divider                   | `className`                         |
