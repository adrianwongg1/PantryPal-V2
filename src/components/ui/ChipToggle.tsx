type ChipToggleProps = {
  name: string;
  value: string;
  defaultChecked?: boolean;
  children: React.ReactNode;
};

// A single checkbox styled as a filled/outline .tag chip — the toggle the
// design canvas draws throughout (1e/6c/7d's diet chips, onboarding's own
// "How you eat" step) but never gives real semantics to; there it's an
// inert <span>. A native checkbox underneath means keyboard and screen-
// reader support come for free, same principle as Seg. Uncontrolled
// (defaultChecked, not checked+onChange) on purpose — a parent form reads
// whichever ones are checked at submit time via FormData.getAll(name), no
// React state needed, so this needs no "use client" either.
export function ChipToggle({ name, value, defaultChecked, children }: ChipToggleProps) {
  return (
    <label className="tag tag-outline cursor-pointer select-none has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only"
      />
      {children}
    </label>
  );
}
