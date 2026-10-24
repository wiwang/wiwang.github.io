"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Main navigation">
      {[
        ["/writing/", "Writing"],
        ["/projects/", "Projects"],
        ["/about/", "About"],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            path.replace(/\/$/, "") === href.replace(/\/$/, "")
              ? "page"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
