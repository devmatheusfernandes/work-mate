import * as React from "react";
import { cn } from "@/lib/utils";
import { SearchX } from "lucide-react";

type EmptyProps = React.HTMLAttributes<HTMLDivElement>;

export const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center border border-border/40 rounded-xl bg-muted/10",
          className
        )}
        {...props}
      />
    );
  }
);
Empty.displayName = "Empty";

type EmptyHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export const EmptyHeader = React.forwardRef<HTMLDivElement, EmptyHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center gap-3 max-w-sm", className)}
        {...props}
      />
    );
  }
);
EmptyHeader.displayName = "EmptyHeader";

interface EmptyMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "icon";
}

export const EmptyMedia = React.forwardRef<HTMLDivElement, EmptyMediaProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          variant === "icon" ? "size-12" : "size-16",
          className
        )}
        {...props}
      />
    );
  }
);
EmptyMedia.displayName = "EmptyMedia";

type EmptyTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const EmptyTitle = React.forwardRef<HTMLParagraphElement, EmptyTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn("text-lg font-bold tracking-tight text-foreground", className)}
        {...props}
      />
    );
  }
);
EmptyTitle.displayName = "EmptyTitle";

type EmptyDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  EmptyDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
});
EmptyDescription.displayName = "EmptyDescription";

type EmptyContentProps = React.HTMLAttributes<HTMLDivElement>;

export const EmptyContent = React.forwardRef<HTMLDivElement, EmptyContentProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("mt-4", className)} {...props} />;
  }
);
EmptyContent.displayName = "EmptyContent";

interface EmptyResultsProps {
  searchQuery: string;
  title?: string;
  description?: string;
}

export function EmptyResults({
  searchQuery,
  title = "Nenhum resultado encontrado",
  description,
}: EmptyResultsProps) {
  return (
    <Empty className="py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX className="size-6 text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {description || `Sua busca por "${searchQuery}" não retornou nenhum resultado.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
