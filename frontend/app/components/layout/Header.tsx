"use client";

import UserProfileDropdown from "./UserProfileDropdown";

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-12">
      {/* Left side - Optional: Page title or breadcrumbs */}
      <div className="flex-1">
        {/* Can add page title or breadcrumbs here if needed */}
      </div>

      {/* Right side - User Profile */}
      <div className="flex items-center">
        <UserProfileDropdown />
      </div>
    </header>
  );
}
