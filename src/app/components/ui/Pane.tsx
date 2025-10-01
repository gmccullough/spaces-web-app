"use client";

import React from "react";
import { cn } from "@/app/lib/ui/cn";

type PaneProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

type PaneHeaderProps = {
  title?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

type PaneBodyProps = {
  children: React.ReactNode;
  className?: string;
};

type PaneFooterProps = {
  children?: React.ReactNode;
  className?: string;
};

type PaneActionsProps = {
  children: React.ReactNode;
  className?: string;
};

type PaneComponent = React.FC<PaneProps> & {
  Header: React.FC<PaneHeaderProps>;
  Body: React.FC<PaneBodyProps>;
  Footer: React.FC<PaneFooterProps>;
  Actions: React.FC<PaneActionsProps>;
};

const Pane: PaneComponent = ({ children, className, id }) => {
  return (
    <section
      id={id}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm",
        "@container",
        className
      )}
    >
      {children}
    </section>
  );
};

Pane.Header = function PaneHeader({ title, actions, children, className }: PaneHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex min-h-[3rem] flex-wrap items-center justify-between gap-3",
        "border-b border-gray-200 bg-white/95 px-4 py-2.5 backdrop-blur md:flex-nowrap",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {title ? (
          <h2 className="truncate text-[15px] font-semibold text-gray-900">{title}</h2>
        ) : (
          children ?? null
        )}
      </div>
      {actions ? <Pane.Actions className="shrink-0 text-xs text-gray-600">{actions}</Pane.Actions> : null}
    </div>
  );
};

Pane.Actions = function PaneActions({ children, className }: PaneActionsProps) {
  if (!children) return null;
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
};

Pane.Body = function PaneBody({ children, className }: PaneBodyProps) {
  return (
    <div className={cn("flex-1 overflow-auto px-4 py-4", className)}>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

Pane.Footer = function PaneFooter({ children, className }: PaneFooterProps) {
  if (!children) return null;
  return (
    <div
      className={cn(
        "border-t border-gray-200 bg-white px-4 py-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
};

export default Pane;
