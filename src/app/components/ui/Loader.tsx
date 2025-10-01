"use client";

import React from "react";
import { cn } from "@/app/lib/ui/cn";

type LoaderProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export default function Loader({ label = "Loading", size = "md", className }: LoaderProps) {
  const spinnerClasses = cn(
    "animate-spin rounded-full border-solid border-gray-300 border-t-blue-600",
    sizeMap[size]
  );

  return (
    <div className={cn("flex items-center gap-3 text-gray-600", className)} role="status" aria-live="polite">
      <span className={spinnerClasses} aria-hidden="true" />
      {label ? <span className="text-sm font-medium">{label}</span> : null}
    </div>
  );
}
