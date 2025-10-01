"use client";

import React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/app/lib/ui/cn";

type ToastVariant = "default" | "success" | "error";

type ToastAction = {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
};

type ToastOptions = {
  id?: string;
  title: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  variant?: ToastVariant;
};

type ToastRecord = ToastOptions & { id: string; createdAt: number };

type ToastContextValue = {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  toasts: ToastRecord[];
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, string> = {
  default: "bg-gray-900 text-white",
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
};

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const timers = React.useRef(new Map<string, number>());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => {
      timers.current.forEach((timeout) => window.clearTimeout(timeout));
      timers.current.clear();
    };
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timers.current.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      timers.current.delete(id);
    }
  }, []);

  const showToast = React.useCallback(
    ({ id, title, description, duration = 5000, action, variant = "default" }: ToastOptions) => {
      const toastId = id ?? createId();
      setToasts((prev) => {
        const withoutExisting = prev.filter((toast) => toast.id !== toastId);
        return [
          ...withoutExisting,
          {
            id: toastId,
            title,
            description,
            duration,
            action,
            variant,
            createdAt: Date.now(),
          },
        ];
      });

      if (duration !== Infinity) {
        const timeout = window.setTimeout(() => dismissToast(toastId), duration);
        timers.current.set(toastId, timeout);
      }

      return toastId;
    },
    [dismissToast]
  );

  const contextValue = React.useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast, toasts }),
    [showToast, dismissToast, toasts]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-80 max-w-full flex-col gap-3">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                role="status"
                aria-live="polite"
                className={cn(
                  "pointer-events-auto overflow-hidden rounded-lg shadow-lg",
                  variantStyles[toast.variant ?? "default"]
                )}
              >
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold">{toast.title}</p>
                    {toast.description ? <p className="text-sm opacity-90">{toast.description}</p> : null}
                    {toast.action ? (
                      <button
                        type="button"
                        onClick={() => {
                          toast.action?.onClick();
                          dismissToast(toast.id);
                        }}
                        className="mt-2 text-sm font-semibold underline underline-offset-4"
                        aria-label={toast.action.ariaLabel ?? toast.action.label}
                      >
                        {toast.action.label}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="-m-2 rounded-full p-2 text-sm opacity-80 transition hover:opacity-100"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
