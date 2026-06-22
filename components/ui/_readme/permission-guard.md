# PermissionGuard Component Guide

The `PermissionGuard` is a security wrapper that conditionally renders content based on User RBAC permissions. It is integrated with the project's **Shimmer** system for smooth hydration.

## Basic Usage

```tsx
import { PermissionGuard } from "@/components/ui/permission-guard";

<PermissionGuard permission="student.class.cancel">
  <CancelButton />
</PermissionGuard>
```

## Advanced Usage (with Shimmer Hydration)

Since permissions are hydrated on the client, using `PermissionGuard` directly might cause layout shifts. To prevent this, provide `templateProps` that match the children's props. The guard will render a "Shimmer" (skeleton) version of the children while checking permissions.

```tsx
<PermissionGuard 
  permission="user.edit" 
  templateProps={{ variant: "outline", className: "w-full" }}
>
  <Button variant="outline" className="w-full">
    Edit Profile
  </Button>
</PermissionGuard>
```

## Props

| Prop | Type | Description |
|-----------|-------------|-------|
| `permission` | `Permission` | The required permission string (type-safe) |
| `children` | `ReactNode` | Content to show if authorized |
| `fallback` | `ReactNode` | Optional content to show if denied (default: `null`) |
| `templateProps`| `Record` | Props passed to Shimmer for mock rendering |

## How it works

1. **Pre-Hydration**: Shows a `Shimmer` component wrapping the `children`.
2. **Hydration**: Checks the current user's permissions via `useRBAC()`.
3. **Admin Rule**: If the user has the `admin` role, `canSee` is always `true` (standard behavior in our RBAC system).
4. **Rendering**:
   - If authorized: Renders `children`.
   - If denied: Renders `fallback`.

## Best Practices

- Always use `PermissionGuard` for buttons or links that trigger restricted Server Actions.
- Provide `templateProps` whenever possible to ensure the skeleton matches the final UI size/shape.
