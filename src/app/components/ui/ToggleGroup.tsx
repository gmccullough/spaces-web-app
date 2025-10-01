"use client";

import React from "react";
import { cn } from "@/app/lib/ui/cn";

type ToggleOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
};

type ToggleSize = "sm" | "md";

type ToggleVariant = "ghost" | "solid";

type ToggleGroupProps = {
  value: string;
  onChange: (value: string) => void;
  options: ToggleOption[];
  size?: ToggleSize;
  variant?: ToggleVariant;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

const sizeStyles: Record<ToggleSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

const ToggleGroup: React.FC<ToggleGroupProps> = ({
  value,
  onChange,
  options,
  size = "md",
  variant = "ghost",
  className,
  ariaLabel,
  disabled = false,
}) => {
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (startIndex: number, direction: 1 | -1) => {
    const total = options.length;
    if (total === 0) return;

    let index = startIndex;
    for (let i = 0; i < total; i += 1) {
      index = (index + direction + total) % total;
      const option = options[index];
      if (option.disabled) continue;
      const ref = optionRefs.current[index];
      if (ref) {
        ref.focus();
        onChange(option.value);
      }
      break;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(currentIndex, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveFocus(currentIndex, -1);
        break;
      case "Home":
        event.preventDefault();
        moveFocus(-1, 1);
        break;
      case "End":
        event.preventDefault();
        moveFocus(0, -1);
        break;
      default:
        break;
    }
  };

  const groupClasses = cn(
    "inline-flex items-center gap-1 rounded-lg border border-transparent bg-gray-100 p-1",
    disabled && "opacity-60",
    className
  );

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={groupClasses}>
      {options.map((option, index) => {
        const isActive = option.value === value;
        const buttonClasses = cn(
          "flex items-center gap-2 rounded-md font-medium transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          sizeStyles[size],
          option.disabled || disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          variant === "ghost" &&
            (isActive
              ? "bg-blue-600 text-white shadow"
              : "bg-transparent text-gray-700 hover:bg-white hover:text-gray-900"),
          variant === "solid" &&
            (isActive
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"),
          variant === "ghost" && !isActive && "border border-transparent",
          variant === "solid" && isActive && "border border-blue-600"
        );

        return (
          <button
            key={option.value}
            ref={(el) => {
              optionRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.ariaLabel || option.label}
            disabled={option.disabled || disabled}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => {
              if (option.disabled || disabled) return;
              if (option.value !== value) {
                onChange(option.value);
              }
            }}
            className={buttonClasses}
          >
            {option.icon ? <span aria-hidden="true">{option.icon}</span> : null}
            <span className="whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ToggleGroup;
