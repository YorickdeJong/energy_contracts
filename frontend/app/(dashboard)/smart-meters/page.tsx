import { BoltIcon } from "@heroicons/react/24/outline";
import Button from "@/app/components/ui/Button";

export default function SmartMetersPage() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
          <BoltIcon className="h-10 w-10 text-primary" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold text-text-primary mb-3">
          No Smart Meters Connected
        </h2>

        {/* Description */}
        <p className="text-text-secondary mb-8 leading-relaxed">
          Connect your smart meter to view real-time energy consumption data and insights for your household.
        </p>

        {/* Call to Action */}
        <Button variant="primary" size="lg">
          Add Smart Meter
        </Button>

        {/* Additional Info */}
        <p className="text-xs text-text-tertiary mt-6">
          Need help? Check our{" "}
          <a href="#" className="text-primary hover:underline">
            setup guide
          </a>
        </p>
      </div>
    </div>
  );
}
