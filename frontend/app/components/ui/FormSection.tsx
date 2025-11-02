import { ReactNode } from "react";

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const FormSection = ({
  title,
  description,
  children,
  className = "",
}: FormSectionProps) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-base text-text-secondary">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
};

export default FormSection;
