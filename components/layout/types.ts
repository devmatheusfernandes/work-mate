export interface SubMenuItem {
    href: string;
    label: string;
    labelKey?: string;
    icon?: React.ReactNode;
}

export interface MenuItemType {
    href: string;
    label: string;
    labelKey?: string;
    icon?: React.ReactNode;
    Icon?: React.ElementType;
    iconProps?: Record<string, unknown>;
    subItems?: SubMenuItem[];
    badgeCount?: number;
}
