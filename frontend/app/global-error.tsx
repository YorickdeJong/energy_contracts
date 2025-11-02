"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans">
          <div className="text-center max-w-md">
            {/* Error Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-3xl font-semibold text-gray-900 mb-3">
              Critical Error
            </h1>

            {/* Error Description */}
            <p className="text-gray-600 mb-8 leading-relaxed">
              A critical error occurred in the application. Please try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === "development" && error.message && (
              <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
                <p className="text-xs font-mono text-gray-700 break-words">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-gray-500 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Reload Page
              </button>
            </div>

            {/* Support Link */}
            <p className="text-xs text-gray-500 mt-8">
              Error ID: {error.digest || "Unknown"}
              {" • "}
              <a href="mailto:support@energycontracts.com" className="text-blue-600 hover:underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
