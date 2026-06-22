export function isPathActive(
    pathname: string | null,
    href: string | undefined,
) {
    if (!pathname || !href) return false;
    const normalizedHref =
        href !== "/" && href.endsWith("/") ? href.slice(0, -1) : href;
    return (
        pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`)
    );
}