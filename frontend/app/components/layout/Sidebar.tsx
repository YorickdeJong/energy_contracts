"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, BuildingOfficeIcon, UserCircleIcon, BoltIcon } from "@heroicons/react/24/outline";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/households", icon: HomeIcon },
  { name: "Households", href: "/households", icon: BuildingOfficeIcon },
  { name: "Smart Meters", href: "/smart-meters", icon: BoltIcon },
  { name: "Profile", href: "/profile", icon: UserCircleIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/households") {
      return pathname === href || pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-background-secondary">
      {/* Logo/Branding */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/households" className="flex items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-semibold text-sm">
            EC
          </div>
          <span className="ml-3 text-lg font-semibold text-text-primary">
            Energy Contracts
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2.5 text-sm font-medium rounded-lg
                transition-colors duration-200
                ${
                  active
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-background hover:text-text-primary"
                }
              `}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <p className="text-xs text-text-tertiary text-center">
          © 2025 Energy Contracts
        </p>
      </div>
    </div>
  );
}
