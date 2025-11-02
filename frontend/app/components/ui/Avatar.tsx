"use client";

import { useState, ImgHTMLAttributes } from "react";

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fallbackText?: string;
}

const Avatar = ({
  src,
  alt,
  size = "md",
  fallbackText,
  className = "",
  ...props
}: AvatarProps) => {
  const [imageError, setImageError] = useState(false);

  const sizeStyles = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
  };

  const baseStyles = "rounded-full object-cover";
  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${className}`;

  // Generate initials from fallbackText or alt
  const getInitials = (text: string) => {
    const words = text.trim().split(/\s+/);
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(fallbackText || alt);

  if (!src || imageError) {
    return (
      <div
        className={`${combinedStyles} bg-primary/10 text-primary flex items-center justify-center font-medium`}
        title={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={combinedStyles}
      onError={() => setImageError(true)}
      {...props}
    />
  );
};

export default Avatar;
