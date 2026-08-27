"use client";

// The +/-/count control the design canvas draws for "Serves" — originally
// written inline in GenerateForm, pulled out here once Preferences needed
// the exact same control a second time.
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-bg px-2.5 py-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid h-6.5 w-6.5 place-items-center rounded-full bg-surface text-ink"
        aria-label={`Fewer — ${label}`}
      >
        −
      </button>
      <span className="min-w-4 text-center font-heading text-[17px]">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-6.5 w-6.5 place-items-center rounded-full bg-surface text-ink"
        aria-label={`More — ${label}`}
      >
        +
      </button>
    </div>
  );
}
