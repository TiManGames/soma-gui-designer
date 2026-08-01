import { useStore } from "../state/store";
import { validateDocument } from "@core/validate/validateDocument";
import { validateAgainstSchema } from "@core/validate/validateSchema";

export function ValidationList() {
  const doc = useStore((s) => s.doc);
  const errors = [...validateDocument(doc), ...validateAgainstSchema(doc)];

  if (errors.length === 0) {
    return (
      <div className="validation">
        <div className="v-ok">
          <span>✓</span> No validation issues.
        </div>
      </div>
    );
  }

  return (
    <div className="validation">
      {errors.map((err, i) => (
        <div className="v-item" key={i}>
          <span aria-hidden>▸</span>
          <span>{err}</span>
        </div>
      ))}
    </div>
  );
}
