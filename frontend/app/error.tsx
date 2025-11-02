"use client";

import { useEffect } from "react";
import Button from "./components/ui/Button";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-error/10 mb-6">
          <ExclamationTriangleIcon className="h-10 w-10 text-error" />
        </div>

        {/* Error Title */}
        <h1 className="text-3xl font-semibold text-text-primary mb-3">
          Something went wrong
        </h1>

        {/* Error Description */}
        <p className="text-text-secondary mb-8 leading-relaxed">
          We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
        </p>

        {/* Error Details (in development) */}
        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mb-6 rounded-lg bg-background-secondary p-4 text-left">
            <p className="text-xs font-mono text-text-secondary break-words">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-text-tertiary mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={reset}
          >
            Try Again
          </Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/households")}
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Support Link */}
        <p className="text-xs text-text-tertiary mt-8">
          Need help?{" "}
          <a href="mailto:support@energycontracts.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
