"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const dockItems = [
  {
    label: "Главная",
    href: "/",
    matches: ["/"],
  },
  {
    label: "Смена",
    href: "/record",
    matches: ["/record", "/shifts", "/handover"],
  },
  {
    label: "Обход",
    href: "/morning-rounds",
    matches: ["/morning-rounds", "/evening-prep"],
  },
  {
    label: "Ресурсы",
    href: "/water-co2",
    matches: ["/water-co2", "/dashboard", "/chat", "/insights"],
  },
  {
    label: "Узлы",
    href: "/equipment",
    matches: ["/equipment"],
  },
] as const;

function isActivePath(pathname: string, matches: readonly string[]) {
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

export default function MobileDock() {
  const pathname = usePathname();

  return (
    <nav className="mobile-dock" aria-label="Быстрая навигация">
      <div className="mobile-dock-inner">
        {dockItems.map((item) => {
          const isActive = isActivePath(pathname, item.matches);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={["mobile-dock-link", isActive ? "is-active" : ""].filter(Boolean).join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="mobile-dock-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
