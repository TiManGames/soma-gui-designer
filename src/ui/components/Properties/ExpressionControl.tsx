import { useState, type ReactNode } from "react";

interface Props {
  label: string;
  value: string | undefined;
  canEditValue: boolean;
  onChange: (value: string) => void;
  children?: ReactNode;
  compact?: boolean;
}

/** Mode is local UI state. Neither switching modes nor rendering writes a value. */
export function ExpressionControl({ label, value, canEditValue, onChange, children, compact = false }: Props) {
  const [mode, setMode] = useState<"value" | "expression">("value");
  const expression = mode === "expression" || !canEditValue;
  return (
    <div className={`expression-control${compact ? " compact-expression" : ""}`}>
      {compact ? <button type="button" className="expression-fx" aria-label={`${label} expression mode`} aria-pressed={expression}
        disabled={!canEditValue} title={!canEditValue ? "Enter a supported literal to return to Value mode" : expression ? "Edit typed value" : "Edit AngelScript expression"}
        onClick={() => setMode(expression ? "value" : "expression")}>fx</button> : <div className="expression-mode" role="group" aria-label={`${label} editor mode`}>
        <button type="button" aria-pressed={!expression} disabled={!canEditValue}
          title={canEditValue ? "Edit a typed value" : "Enter a supported literal or remove the override to use Value mode"}
          onClick={() => setMode("value")}>Value</button>
        <button type="button" aria-pressed={expression} onClick={() => setMode("expression")}>Expression</button>
      </div>}
      {expression ? <input type="text" aria-label={`${label} expression`} value={value ?? ""}
        placeholder="AngelScript expression" onChange={e => onChange(e.target.value)} /> : children}
    </div>
  );
}
