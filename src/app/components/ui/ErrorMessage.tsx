"use client";

import React from "react";
import { cn } from "@/app/lib/ui/cn";

type ErrorMessageProps = {
  title?: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

export default function ErrorMessage({ title = "Something went wrong", description, className, action }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {description ? <p className="text-red-700">{description}</p> : null}
          {action ? <div className="pt-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
