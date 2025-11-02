"use client";

import Link from "next/link";
import { Button } from "@/app/components/ui";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo.png" alt="Energy Contracts" className="h-8 w-auto" />
            <span className="text-xl font-semibold text-text-primary hidden sm:inline">
              Energy Contracts
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-text-secondary hover:text-primary transition-colors text-sm font-medium"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-text-secondary hover:text-primary transition-colors text-sm font-medium"
            >
              How It Works
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-text-primary hover:text-primary"
              >
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button
                variant="primary"
                className="hidden sm:inline-flex"
              >
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
