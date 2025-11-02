"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "../ui/Avatar";
import { UserCircleIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

export default function UserProfileDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = session?.user as any;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (!user) {
    return null;
  }

  const userName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.email;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-background-secondary"
      >
        <Avatar
          src={user.profile_picture}
          alt={userName}
          fallbackText={userName}
          size="sm"
        />
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-text-primary">{userName}</p>
          <p className="text-xs text-text-secondary">{user.email}</p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-background border border-border shadow-lg animate-fadeIn">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-text-primary">{userName}</p>
            <p className="text-xs text-text-secondary truncate">{user.email}</p>
            {user.role && (
              <span className="mt-1 inline-flex items-center rounded-full bg-background-secondary px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">
                {user.role}
              </span>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-background-secondary transition-colors duration-200"
            >
              <UserCircleIcon className="mr-3 h-5 w-5 text-text-secondary" />
              View Profile
            </Link>

            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-2 text-sm text-error hover:bg-background-secondary transition-colors duration-200"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
