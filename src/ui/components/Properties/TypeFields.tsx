import { useStore } from "../../state/store";
import type { WidgetNode } from "@core/model/nodes";
import { gaugeFillAmount } from "@core/model/gaugeFill";
import { NumberInput } from "../NumberInput";

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
      <NumberInput
        step={step}
        value={value}
        onCommit={(v) => updateNode(node.id, { [key]: v } as Partial<WidgetNode>)}
      />
    </label>
  );

  const gaugeFillField = () => (
    <label>
      Fill amount
      <NumberInput
        min={0}
        max={1}
        step={0.01}
        value={gaugeFillAmount(node.type === "gauge" ? node.fillExpr : undefined)}
        onCommit={(v) => updateNode(node.id, { fillExpr: String(v) } as Partial<WidgetNode>)}
      />
    </label>
  );

  return (
    <div className="field-group">
      <h3>Content</h3>
      {"caption" in node && textField("Caption", "caption", node.caption)}

      {node.type === "station-window" && (
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={node.drawOrnaments === true}
              onChange={(e) => updateNode(node.id, { drawOrnaments: e.target.checked })}
            />
            Draw window ornaments
          </label>
        </div>
      )}

      {node.type === "text-frame" && textField("Text entry (lang key)", "text", node.text)}
      {node.type === "station-text-reader-single" && textField("Body text entry", "text", node.text)}

      {node.type === "image" && textField("Gfx file/name", "gfx", node.gfx)}
      {node.type === "image" && (
        <div className="checkbox-row">
          <label>
            <input
              type="checkbox"
              checked={node.correctAspect}
              onChange={(e) => updateNode(node.id, { correctAspect: e.target.checked })}
            />
            Preserve aspect ratio (DoImageCorrectAspect)
          </label>
        </div>
      )}

      {node.type === "gauge" && gaugeFillField()}
      {node.type === "label" && numField("Font size mul", "fontSizeMul", node.fontSizeMul, 0.1)}
      {node.type === "station-numpad" && numField("Digits", "digits", node.digits)}
      {node.type === "advanced-imgui" && textField("Raw HPS code", "code", node.code, true)}

      {(node.type === "slider-h" || node.type === "slider-v") && (
        <>
          {textField("Default value", "defaultValue", node.defaultValue)}
          {textField("Min", "min", node.min)}
          {textField("Max", "max", node.max)}
          {textField("Step", "step", node.step)}
        </>
      )}

      {(node.type === "multi-toggle" || node.type === "multi-select") &&
        textField("Items (pipe-separated)", "itemsText", node.itemsText)}
      {node.type === "multi-toggle" && numField("Columns", "columns", node.columns)}

      {node.type === "layout" && (
        <label>
          Layout type
          <select
            value={node.layoutType}
            onChange={(e) => updateNode(node.id, { layoutType: e.target.value })}
          >
            <option value="eImGuiLayout_X">X (horizontal)</option>
            <option value="eImGuiLayout_Y">Y (vertical)</option>
            <option value="eImGuiLayout_XY">XY (wrap)</option>
            <option value="eImGuiLayout_X_Tabbed">X Tabbed</option>
          </select>
        </label>
      )}
    </div>
  );
}
