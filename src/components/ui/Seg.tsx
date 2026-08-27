import type { ReactNode } from "react";

export type SegOption<T extends string> = { value: T; label: ReactNode };

type SegProps<T extends string> = {
  name: string;
  value: T;
  options: readonly SegOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
};

// A segmented control on real radio inputs — the design canvas draws these
// as plain <span>s with no underlying semantics (e.g. 7c's Effort control),
// which this replaces: native radios mean keyboard nav (arrow keys within
// the group, Tab in/out) and screen reader behavior come for free from
// .seg/.seg-opt's :has(input:checked) styling in globals.css, not from
// anything this component has to implement itself.
export function Seg<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
  ...aria
}: SegProps<T>) {
  return (
    <div className={["seg", className].filter(Boolean).join(" ")} role="radiogroup" {...aria}>
      {options.map((opt) => (
        <label key={opt.value} className="seg-opt">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
