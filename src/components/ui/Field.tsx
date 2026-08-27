import type { LabelHTMLAttributes, ReactNode } from "react";

type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>;
};

export function Field({ label, htmlFor, children, className, labelProps }: FieldProps) {
  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label htmlFor={htmlFor} {...labelProps}>
        {label}
      </label>
      {children}
    </div>
  );
}
