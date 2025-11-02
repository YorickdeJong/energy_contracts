"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  HomeIcon,
  BuildingOfficeIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Avatar from "../ui/Avatar";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Households", href: "/households", icon: BuildingOfficeIcon },
  { name: "Smart Meters", href: "/smart-meters", icon: BoltIcon },
  { name: "Analytics", href: "/analytics", icon: ChartBarIcon },
  { name: "Tasks", href: "/tasks", icon: CheckCircleIcon },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href || pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  const userName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email;

  return (
    <div
      className={`
        flex h-full flex-col bg-background border-r border-border
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Logo/Branding */}
      <div className="flex h-16 items-center justify-center border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-sm">
            {isCollapsed ? "E" : "EC"}
          </div>
          {!isCollapsed && (
            <span className="ml-3 text-lg font-semibold text-text-primary whitespace-nowrap">
              Energy Contracts
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center rounded-xl
                transition-all duration-200
                ${isCollapsed ? "justify-center py-3 px-3" : "px-4 py-3"}
                ${
                  active
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:bg-background-secondary hover:text-text-primary"
                }
              `}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={`h-6 w-6 flex-shrink-0 ${!isCollapsed && "mr-3"}`} />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </Link>
          );
        })}

        {/* Toggle Button */}
        <div className="pt-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
              flex items-center justify-center w-full rounded-xl
              bg-primary text-white shadow-md
              transition-all duration-200 hover:bg-primary-dark
              ${isCollapsed ? "h-12 w-12 mx-auto" : "h-12"}
            `}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-6 w-6" />
            ) : (
              <ChevronLeftIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* User Profile */}
      <Link
        href="/profile"
        className={`
          flex items-center border-b border-border
          transition-colors duration-200 hover:bg-background-secondary
          ${isCollapsed ? "justify-center py-4" : "px-4 py-4"}
        `}
        title={isCollapsed ? userName : undefined}
      >
        {user ? (
          <>
            <Avatar
              src={user.profile_picture}
              alt={userName}
              fallbackText={userName}
              size="sm"
            />
            {!isCollapsed && (
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">
                  {userName}
                </p>
                <p className="text-xs text-text-tertiary truncate">
                  {user.role}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <UserCircleIcon className="h-8 w-8 text-text-secondary" />
            {!isCollapsed && (
              <span className="ml-3 text-sm text-text-secondary">Profile</span>
            )}
          </>
        )}
      </Link>

      {/* Help/Support */}
      <Link
        href="/support"
        className={`
          group relative flex items-center
          transition-colors duration-200 hover:bg-background-secondary
          ${isCollapsed ? "justify-center py-4" : "px-4 py-4"}
        `}
        title={isCollapsed ? "Help & Support" : undefined}
      >
        <QuestionMarkCircleIcon className={`h-6 w-6 text-text-secondary ${!isCollapsed && "mr-3"}`} />
        {!isCollapsed && (
          <span className="text-sm text-text-secondary">Help & Support</span>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
            Help & Support
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
          </div>
        )}
      </Link>
    </div>
  );
}
