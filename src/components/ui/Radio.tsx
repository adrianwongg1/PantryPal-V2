import type { ReactNode } from "react";

export type RadioOption<T extends string> = { value: T; label: ReactNode };

type RadioGroupProps<T extends string> = {
  name: string;
  value: T;
  options: readonly RadioOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

// Real radio inputs styled as .radio/.dot (globals.css) — same reasoning as
// Seg: the design canvas draws these as inert <span>s (7c's visibility
// picker), and a native input underneath gets keyboard nav and screen
// reader semantics for free from the CSS alone.
export function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
}: RadioGroupProps<T>) {
  return (
    <div className={["flex flex-col gap-2.5", className].filter(Boolean).join(" ")}>
      {options.map((opt) => (
        <label key={opt.value} className="radio">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span className="dot" />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
