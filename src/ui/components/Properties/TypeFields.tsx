import { useStore } from "../../state/store";
import type { WidgetNode } from "@core/model/nodes";

/** First-class, type-specific fields (caption, text, gfx, etc.). */
export function TypeFields({ node }: { node: WidgetNode }) {
  const updateNode = useStore((s) => s.updateNode);

  const textField = (label: string, key: string, value: string, multiline = false) => (
    <label>
      {label}
      {multiline ? (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => updateNode(node.id, { [key]: e.target.value } as Partial<WidgetNode>)}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => updateNode(node.id, { [key]: e.target.value } as Partial<WidgetNode>)}
        />
      )}
    </label>
  );

  const numField = (label: string, key: string, value: number, step = 1) => (
    <label>
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => updateNode(node.id, { [key]: Number(e.target.value) } as Partial<WidgetNode>)}
      />
    </label>
  );

  return (
    <div className="field-group">
      <h3>Content</h3>
      {"caption" in node && textField("Caption", "caption", node.caption)}

      {node.type === "text-frame" && textField("Text entry (lang key)", "text", node.text)}
      {node.type === "station-text-reader-single" &&
        textField("Body text entry", "text", node.text)}
      {node.type === "image" && textField("Gfx file/name", "gfx", node.gfx)}
      {node.type === "gauge" && textField("Fill expression", "fillExpr", node.fillExpr)}
      {node.type === "label" && numField("Font size mul", "fontSizeMul", node.fontSizeMul, 0.1)}
      {node.type === "station-numpad" && numField("Digits", "digits", node.digits)}
      {node.type === "advanced-imgui" && textField("Raw HPS code", "code", node.code, true)}
    </div>
  );
}
