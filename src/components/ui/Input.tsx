import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input ref={ref} className={["input", className].filter(Boolean).join(" ")} {...props} />
    );
  },
);

// Same .input class — globals.css's `textarea.input` rule adjusts min-height
// and radius for the multi-line case, so this is a distinct component, not
// just Input with as="textarea".
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={["input", className].filter(Boolean).join(" ")} {...props} />
  );
});
