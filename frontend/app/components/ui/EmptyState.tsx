import { PlusIcon } from "@heroicons/react/24/outline";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }> | React.ReactElement;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'function') {
      const Icon = icon;
      return <Icon className="mx-auto h-12 w-12 text-text-tertiary" />;
    }
    return icon;
  };

  return (
    <div className="text-center py-12">
      {renderIcon()}
      <h3 className="mt-4 text-lg font-medium text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
      {!action && actionLabel && onAction && (
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

// Also export as named export for flexibility
export { EmptyState };
