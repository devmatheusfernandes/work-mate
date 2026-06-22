# Vault Component Guide

The `Vault` is the project's standard for overlays (Drawers/Modals). It is highly adaptive for PWA and follows a "Floaty" design on mobile devices.

## Basic Usage (Compound Components)

```tsx
import {
    Vault,
    VaultTrigger,
    VaultContent,
    VaultHeader,
    VaultTitle,
    VaultDescription,
    VaultBody,
    VaultFooter,
    VaultPrimaryButton,
    VaultSecondaryButton,
} from "@/components/ui/vault";

<Vault>
  <VaultTrigger>Open Vault</VaultTrigger>
  <VaultContent>
    <VaultHeader>
      <VaultTitle>Are you sure?</VaultTitle>
      <VaultDescription>This action cannot be undone.</VaultDescription>
    </VaultHeader>
    
    <VaultBody>
      {/* Your content here */}
    </VaultBody>

    <VaultFooter>
      <VaultSecondaryButton>Cancel</VaultSecondaryButton>
      <VaultPrimaryButton variant="destructive">Confirm</VaultPrimaryButton>
    </VaultFooter>
  </VaultContent>
</Vault>
```

## PWA & Responsive Behavior

The `Vault` automatically changes its appearance based on the device:
- **PWA (Standalone)**: Appears as a "Floaty" card (rounded corners, detached from edges).
- **Mobile Browser**: Appears as a standard bottom sheet.
- **Desktop**: Appears as a centered modal/drawer.

## Specialized Components

### VaultIcon
Use this for consistent header visuals.
```tsx
<VaultIcon type="warning" />
```
Available types: `info`, `warning`, `error`, `success`, `delete`, `confirm`, `settings`, `user`, etc.

### VaultForm & VaultField
Standard containers for forms inside vaults.
```tsx
<VaultForm onSubmit={...}>
  <VaultField label="Email" error={errors.email?.message}>
    <VaultInput {...register("email")} />
  </VaultField>
</VaultForm>
```

## Best Practices

1. **Always use Vault**: Never use standard `Dialog` or `Modal`.
2. **Focus Management**: The vault automatically focuses the first input it finds inside `VaultContent`.
3. **Handle**: The "pull handle" is shown by default but can be disabled with `<VaultContent showHandle={false}>`.
4. **Padding**: Use `<VaultContent noPadding>` for edge-to-edge content (like lists or images).
