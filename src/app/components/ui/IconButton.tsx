"use client";

import React from "react";
import { cn } from "@/app/lib/ui/cn";

type IconButtonVariant = "ghost" | "primary" | "danger";

type IconButtonSize = "sm" | "md";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  ariaLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isActive?: boolean;
  isLoading?: boolean;
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
};

const variantStyles: Record<IconButtonVariant, string> = {
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-blue-500",
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

const activeStyles: Record<IconButtonVariant, string> = {
  ghost: "bg-gray-200 text-gray-900",
  primary: "bg-blue-700 text-white",
  danger: "bg-red-700 text-white",
};

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    ariaLabel,
    variant = "ghost",
    size = "md",
    isActive = false,
    isLoading = false,
    disabled,
    className,
    type = "button",
    ...rest
  },
  ref
) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      {...rest}
      type={type}
      ref={ref}
      aria-label={ariaLabel}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-transparent",
        "transition focus-visible:outline-none focus-visible:ring-2",
        sizeStyles[size],
        variantStyles[variant],
        isActive && activeStyles[variant],
        isDisabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span className={cn(isLoading && "animate-pulse opacity-70")} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
});

export default IconButton;
