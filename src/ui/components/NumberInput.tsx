import { useEffect, useRef, useState } from "react";

interface Props {
  /** Committed numeric value from the store. */
  value: number;
  /** Called with a valid number as the user types a parseable value, and on blur. */
  onCommit: (n: number) => void;
  /** Minimum committed value — enforced on blur only, so intermediate typing is free. */
  min?: number;
  /** Maximum committed value — enforced on blur only. */
  max?: number;
  step?: number | string;
  className?: string;
  title?: string;
  placeholder?: string;
}

/**
 * A numeric input that tolerates transient empty / partial text while typing.
 *
 * The old pattern `onChange={e => setX(Number(e.target.value) || fallback)}` forced
 * a fallback (e.g. 1) the instant the field was cleared, making it impossible to
 * replace "10" with "25" — deleting "10" snapped the value to "1", and the next
 * digit landed after it. This keeps a local draft string so the field can be
 * momentarily empty or partial ("", "-", "1."), committing a number only when one
 * parses. A ref tracks the value we last emitted so our own store echo doesn't
 * clobber an in-progress edit, while genuine external changes (undo, presets) still
 * re-sync the draft.
 */
export function NumberInput({ value, onCommit, min, max, step, className, title, placeholder }: Props) {
  const [draft, setDraft] = useState(String(value));
  const lastEmitted = useRef<number | null>(null);

  useEffect(() => {
    // Ignore the echo of a value we just committed; sync on real external changes.
    if (lastEmitted.current !== null && value === lastEmitted.current) return;
    setDraft(String(value));
  }, [value]);

  const emit = (n: number) => {
    lastEmitted.current = n;
    onCommit(n);
  };

  return (
    <input
      type="number"
      className={className}
      title={title}
      placeholder={placeholder}
      step={step}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        // Commit live only when the text parses; empty/partial text is preserved.
        if (e.target.value.trim() !== "" && Number.isFinite(n)) emit(n);
      }}
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (e.target.value.trim() === "" || !Number.isFinite(n)) {
          setDraft(String(value)); // revert to last good value
          return;
        }
        const clamped =
          min !== undefined || max !== undefined
            ? Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
            : n;
        setDraft(String(clamped));
        if (clamped !== value) emit(clamped);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
