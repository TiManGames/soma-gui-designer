import { useStore } from "../state/store";
import { validateDocument } from "@core/validate/validateDocument";

export function ValidationList() {
  const doc = useStore((s) => s.doc);
  const errors = validateDocument(doc);

  if (errors.length === 0) {
    return (
      <ul className="validation-list ok">
        <li>No validation issues.</li>
      </ul>
    );
  }

  return (
    <ul className="validation-list">
      {errors.map((err, i) => (
        <li key={i}>{err}</li>
      ))}
    </ul>
  );
}
