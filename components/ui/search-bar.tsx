import * as React from "react";
import { twMerge } from "tailwind-merge";
import { Input } from "./input";
import { SearchIcon } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /**
     * If true, the input will have a red border to indicate an error.
     * @default false
     */
    hasError?: boolean;
    /**
     * The size of the input element.
     * @default 'base'
     */
    inputSize?: "sm" | "base" | "lg";
    /**
     * Optional icon to display on the left side of the input
     */
    leftIcon?: React.ReactNode;
    /**
     * Optional icon to display on the right side of the input
     */
    rightIcon?: React.ReactNode;
    /**
     * Optional label for the input
     */
    label?: string;
    /**
     * Optional helper text to display below the input
     */
    helperText?: string;
}

// Define the component's props
export interface SearchBarProps extends InputProps {
    containerClassName?: string;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
    (
        {
            className,
            containerClassName,
            hasError,
            rightIcon,
            ...rest
        },
        ref,
    ) => {
        return (
            <div
                className={twMerge(
                    "relative flex w-full items-center",
                    containerClassName,
                )}
            >
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="h-5 w-5 z-50 text-primary/50 dark:text-primary" />
                </div>
                <Input
                    type="search"
                    ref={ref}
                    className={twMerge(
                        "pl-10 border-none!",
                        rightIcon && "pr-10",
                        className
                    )}
                    hasError={hasError}
                    {...rest}
                />
                {rightIcon && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        {rightIcon}
                    </div>
                )}
            </div>
        );
    },
);

SearchBar.displayName = "SearchBar";

export { SearchBar };
