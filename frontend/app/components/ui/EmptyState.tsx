import { PlusIcon } from "@heroicons/react/24/outline";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {Icon && (
        <Icon className="mx-auto h-12 w-12 text-text-tertiary" />
      )}
      <h3 className="mt-4 text-lg font-medium text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction} variant="primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
