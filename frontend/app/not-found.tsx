import Link from "next/link";
import Button from "./components/ui/Button";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <MagnifyingGlassIcon className="h-10 w-10 text-primary" />
        </div>

        {/* Large 404 Number */}
        <div className="text-6xl font-bold text-primary/20 mb-4">404</div>

        {/* Error Title */}
        <h1 className="text-3xl font-semibold text-text-primary mb-3">
          Page Not Found
        </h1>

        {/* Error Description */}
        <p className="text-text-secondary mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Please check the URL or return to the dashboard.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/households">
            <Button variant="primary">
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/smart-meters">
            <Button variant="secondary">
              Smart Meters
            </Button>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-text-tertiary mb-3">Quick Links</p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/households" className="text-primary hover:underline">
              Households
            </Link>
            <Link href="/profile" className="text-primary hover:underline">
              Profile
            </Link>
            <Link href="/smart-meters" className="text-primary hover:underline">
              Smart Meters
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
