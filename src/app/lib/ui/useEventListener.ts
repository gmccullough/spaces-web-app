"use client";

import React from "react";

type SupportedEventTarget = Window | Document | HTMLElement | EventTarget;

type Handler<T> = (event: T) => void;

export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: Handler<WindowEventMap[K]>,
  target?: SupportedEventTarget | null,
  options?: AddEventListenerOptions
): void;
export function useEventListener(
  type: string,
  handler: Handler<Event>,
  target?: SupportedEventTarget | null,
  options?: AddEventListenerOptions
): void;
export function useEventListener(
  type: string,
  handler: Handler<Event>,
  target: SupportedEventTarget | null = typeof window !== "undefined" ? window : null,
  options?: AddEventListenerOptions
) {
  const savedHandler = React.useRef(handler);

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const targetElement = target ?? (typeof window !== "undefined" ? window : undefined);
    if (!targetElement || !("addEventListener" in targetElement)) return;

    const listener = (event: Event) => {
      savedHandler.current(event);
    };

    (targetElement as SupportedEventTarget).addEventListener(type, listener as EventListener, options);
    return () => {
      (targetElement as SupportedEventTarget).removeEventListener(type, listener as EventListener, options);
    };
  }, [type, target, options]);
}
