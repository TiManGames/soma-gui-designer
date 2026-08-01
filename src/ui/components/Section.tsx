import { useState, type ReactNode } from "react";

/**
 * Collapsible titled section used throughout the rails. Purely presentational;
 * remembers its open state locally.
 */
export function Section({
  title,
  children,
  defaultOpen = true,
  right
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  right?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`rail-section${open ? "" : " collapsed"}`}>
      <header className="rail-section-head">
        <button className="rail-section-toggle" onClick={() => setOpen((v) => !v)}>
          <span className={`chevron${open ? " open" : ""}`} aria-hidden />
          <span>{title}</span>
        </button>
        {right}
      </header>
      {open && <div className="rail-section-body">{children}</div>}
    </section>
  );
}
