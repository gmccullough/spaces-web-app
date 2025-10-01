"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Cross2Icon } from "@radix-ui/react-icons";
import { cn } from "@/app/lib/ui/cn";

type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  size?: ModalSize;
  isDismissible?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  className?: string;
  showCloseButton?: boolean;
};

type ModalSectionProps = {
  children: React.ReactNode;
  className?: string;
};

type ModalComponent = React.FC<ModalProps> & {
  Header: React.FC<ModalSectionProps>;
  Body: React.FC<ModalSectionProps>;
  Footer: React.FC<ModalSectionProps>;
};

const MODAL_WIDTH: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

const FOCUSABLE_SELECTORS = [
  "[data-autofocus]",
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const Modal: ModalComponent = ({
  isOpen,
  onClose,
  children,
  title,
  ariaLabel,
  size = "md",
  isDismissible = true,
  initialFocusRef,
  className,
  showCloseButton = true,
}) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const contentId = React.useId();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    const focusTarget = initialFocusRef?.current;

    const focusFirstElement = () => {
      if (!dialog) return;
      requestAnimationFrame(() => {
        if (focusTarget) {
          focusTarget.focus();
          return;
        }
        const focusable = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialog.focus();
        }
      });
    };

    focusFirstElement();

    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevOverflow;
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus({ preventScroll: true });
      }
    };
  }, [isOpen, initialFocusRef]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDismissible) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && isDismissible) {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
      (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1"
    );

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (current === first || current === dialog) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (current === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  if (!isOpen || !mounted) {
    return null;
  }

  const labelledBy = title ? titleId : undefined;
  const describedBy = contentId;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={cn(
          "relative z-10 mx-4 w-full rounded-xl bg-white shadow-xl focus:outline-none",
          MODAL_WIDTH[size],
          className
        )}
        onKeyDown={handleKeyDown}
      >
        {(title || (isDismissible && showCloseButton)) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            {title ? (
              <h2 id={titleId} className="text-xl font-semibold text-gray-900">
                {title}
              </h2>
            ) : <span />}
            {isDismissible && showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Cross2Icon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}
        <div id={contentId} className="px-6 pb-6 pt-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

Modal.Header = function ModalHeader({ children, className }: ModalSectionProps) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>{children}</div>
  );
};

Modal.Body = function ModalBody({ children, className }: ModalSectionProps) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children, className }: ModalSectionProps) {
  return <div className={cn("mt-6 flex items-center justify-end gap-2", className)}>{children}</div>;
};

export default Modal;
