import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

type ButtonClassNameOptions = {
  variant?: ButtonVariant;
  block?: boolean;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  icon: "btn-icon",
};

// Shared with any element that needs .btn styling but isn't a <button> —
// the design canvas renders plenty of `<a class="btn btn-primary">` links
// (e.g. 7c's "Add to a day"), which should go through Next's <Link> with
// this helper, not through the <Button> component below.
export function buttonClassName(
  { variant = "primary", block = false }: ButtonClassNameOptions = {},
  className?: string,
): string {
  return ["btn", VARIANT_CLASS[variant], block && "btn-block", className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonClassNameOptions;

export function Button({
  variant,
  block,
  className,
  type = "button", // never a silent implicit submit
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, block }, className)}
      {...props}
    />
  );
}
