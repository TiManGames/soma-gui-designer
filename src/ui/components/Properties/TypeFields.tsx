import { useStore } from "../../state/store";
import type { WidgetNode } from "@core/model/nodes";
import { NumberInput } from "../NumberInput";
import { TypedExpressionInput } from "./FieldEditor";
import { GfxPicker } from "./GfxPicker";

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
        integer={key === "digits" || key === "columns"}
        min={key === "digits" || key === "columns" ? 1 : undefined}
        value={value}
        onCommit={(v) => updateNode(node.id, { [key]: v } as Partial<WidgetNode>)}
      />
    </label>
  );

  const expressionField = (label: string, key: string, value: string, min?: number, max?: number) => (
    <div className="content-field" key={key}>
      <span>{label}</span>
      <TypedExpressionInput field={{ name: label, type: "float", category: "float" }} value={value} min={min} max={max}
        onChange={expr => updateNode(node.id, { [key]: expr } as Partial<WidgetNode>)} />
    </div>
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

      {node.type === "image" && <div className="content-field"><span>Gfx file/name</span>
        <GfxPicker value={node.gfx} onChange={gfx => updateNode(node.id, { gfx })}
          onClear={() => updateNode(node.id, { gfx: "" })} />
      </div>}
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

      {node.type === "gauge" && expressionField("Fill amount", "fillExpr", node.fillExpr, 0, 1)}
      {node.type === "label" && numField("Font size mul", "fontSizeMul", node.fontSizeMul, 0.1)}
      {node.type === "station-numpad" && numField("Digits", "digits", node.digits)}
      {node.type === "advanced-imgui" && textField("Raw HPS code", "code", node.code, true)}

      {(node.type === "slider-h" || node.type === "slider-v") && (
        <>
          {expressionField("Default value", "defaultValue", node.defaultValue)}
          {expressionField("Min", "min", node.min)}
          {expressionField("Max", "max", node.max)}
          {expressionField("Step", "step", node.step)}
        </>
      )}

      {(node.type === "multi-toggle" || node.type === "multi-select") &&
        textField("Items (pipe-separated)", "itemsText", node.itemsText)}
      {node.type === "multi-toggle" && numField("Columns", "columns", node.columns)}

      {node.type === "layout" && (
        <div className="content-field"><span>Layout type</span>
          <TypedExpressionInput field={{ name: "Layout type", type: "eImGuiLayout", category: "enum", enumType: "eImGuiLayout" }}
            value={node.layoutType} onChange={layoutType => updateNode(node.id, { layoutType })} />
        </div>
      )}
    </div>
  );
}
