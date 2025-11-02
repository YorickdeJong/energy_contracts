"use client";

import { useEffect } from "react";
import Button from "../components/ui/Button";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10 mb-6">
          <ExclamationTriangleIcon className="h-8 w-8 text-error" />
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-semibold text-text-primary mb-3">
          Something went wrong
        </h2>

        {/* Error Description */}
        <p className="text-text-secondary mb-6 leading-relaxed">
          We encountered an error while loading this page. Please try again or return to the dashboard.
        </p>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 rounded-lg bg-background-secondary p-3 text-left max-h-32 overflow-auto">
            <p className="text-xs font-mono text-text-secondary break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-text-tertiary mt-2">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={reset}>
            Try Again
          </Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/households")}
          >
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
