import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Link to the salon storefront — the slug-scoped page when browsing /salon/$slug. */
export function SiteLink({
  slug,
  className,
  style,
  onClick,
  children,
}: {
  slug?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (slug) {
    return (
      <Link to="/salon/$slug" params={{ slug }} className={className} style={style} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/site" className={className} style={style} onClick={onClick}>
      {children}
    </Link>
  );
}

/** Link to the salon's own login page (staff + clients). */
export function LoginLink({
  slug,
  className,
  style,
  onClick,
  children,
}: {
  slug?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (slug) {
    return (
      <Link to="/salon/$slug/login" params={{ slug }} className={className} style={style} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/store-login" className={className} style={style} onClick={onClick}>
      {children}
    </Link>
  );
}
