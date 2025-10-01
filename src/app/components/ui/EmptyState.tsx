"use client";

import React from "react";
import { cn } from "@/app/lib/ui/cn";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dense?: boolean;
  className?: string;
};

export default function EmptyState({
  title = "Nothing here yet",
  description,
  icon,
  action,
  dense = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center text-gray-500",
        dense ? "gap-2 py-4" : "gap-3 py-10",
        className
      )}
    >
      {icon ? <div className="text-3xl" aria-hidden="true">{icon}</div> : null}
      <div className="space-y-1">
        <p className="text-base font-semibold text-gray-700">{title}</p>
        {description ? <p className="text-sm text-gray-500">{description}</p> : null}
      </div>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
