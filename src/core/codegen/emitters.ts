import type {
  AdvancedNode,
  BgBackdropNode,
  BgFlatColorNode,
  BgOrnamentBLNode,
  BgOrnamentBRNode,
  BgOrnamentTLNode,
  BgOrnamentTRNode,
  BgScanlinesNode,
  CheckboxNode,
  FillNode,
  FrameNode,
  GaugeNode,
  GroupNode,
  ImageNode,
  LabelNode,
  LayoutNode,
  MultiSelectNode,
  MultiToggleNode,
  NumpadNode,
  RepeatButtonNode,
  SliderHNode,
  SliderVNode,
  StationButtonNode,
  StationToggleButtonNode,
  StationWindowNode,
  TextFrameNode,
  TextReaderNode,
  WidgetNode,
  WidgetType
} from "../model/nodes";
import { escapeString } from "./format";
import { safeId } from "../model/ids";
import { posExpr, sizeExpr } from "./coordExpr";
import { emitDataVar } from "./emitDataVar";

export interface EmitCtx {
  lines: string[];
  indent: string;
  parentIsGroup: boolean;
  emitChildren: (node: WidgetNode, indent: string) => void;
}

export interface Emitter<N extends WidgetNode> {
  emit: (ctx: EmitCtx, node: N) => void;
}

type EmitterMap = { [K in WidgetType]: Emitter<Extract<WidgetNode, { type: K }>> };

export const EMITTERS: EmitterMap = {
  // ---- Containers -------------------------------------------------------

  "station-window": {
    emit(ctx, n: StationWindowNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}StationGui_DoWindowStart("${escapeString(n.caption)}", ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)}, true);`
      );
      ctx.emitChildren(n, `${ctx.indent}\t`);
      ctx.lines.push(`${ctx.indent}StationGui_DoWindowEnd();`);
    }
  },

  group: {
    emit(ctx, n: GroupNode) {
      ctx.lines.push(
        `${ctx.indent}ImGui_GroupBegin(${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.emitChildren(n, `${ctx.indent}\t`);
      ctx.lines.push(`${ctx.indent}ImGui_GroupEnd();`);
    }
  },

  layout: {
    emit(ctx, n: LayoutNode) {
      ctx.lines.push(
        `${ctx.indent}ImGui_LayoutBegin(${n.layoutType || "eImGuiLayout_Y"}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.emitChildren(n, `${ctx.indent}\t`);
      ctx.lines.push(`${ctx.indent}ImGui_LayoutEnd();`);
    }
  },

  // ---- Elements ---------------------------------------------------------

  "station-button": {
    emit(ctx, n: StationButtonNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}if (ImGui_DoButtonExt("${escapeString(n.id)}", "${escapeString(n.caption)}", ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)}))`
      );
      ctx.lines.push(`${ctx.indent}{`, `${ctx.indent}\t// TODO: ${n.id} pressed`, `${ctx.indent}}`);
    }
  },

  "station-toggle-button": {
    emit(ctx, n: StationToggleButtonNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      const bVar = `b${safeId(n.id)}`;
      ctx.lines.push(
        `${ctx.indent}bool ${bVar} = ImGui_DoToggleButtonExt("${escapeString(n.id)}", "${escapeString(n.caption)}", ImGui_GetStateBool("${escapeString(n.id)}_Checked", false), ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.lines.push(`${ctx.indent}ImGui_SetStateBool("${escapeString(n.id)}_Checked", ${bVar});`);
    }
  },

  "repeat-button": {
    emit(ctx, n: RepeatButtonNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}if (ImGui_DoRepeatButtonExt("${escapeString(n.id)}", "${escapeString(n.caption)}", ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)}))`
      );
      ctx.lines.push(`${ctx.indent}{`, `${ctx.indent}\t// TODO: ${n.id} held`, `${ctx.indent}}`);
    }
  },

  checkbox: {
    emit(ctx, n: CheckboxNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      const bVar = `b${safeId(n.id)}`;
      ctx.lines.push(
        `${ctx.indent}bool ${bVar} = ImGui_DoCheckBoxExt("${escapeString(n.id)}", "${escapeString(n.caption)}", ImGui_GetStateBool("${escapeString(n.id)}_Checked", false), ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.lines.push(`${ctx.indent}ImGui_SetStateBool("${escapeString(n.id)}_Checked", ${bVar});`);
    }
  },

  "slider-h": {
    emit(ctx, n: SliderHNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      const fVar = `f${safeId(n.id)}`;
      ctx.lines.push(
        `${ctx.indent}float ${fVar} = ImGui_DoSliderHorizontalExt("${escapeString(n.id)}", ImGui_GetStateFloat("${escapeString(n.id)}_Val", ${n.defaultValue || "0.5f"}), ${n.min || "0.0f"}, ${n.max || "1.0f"}, ${n.step || "0.1f"}, ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.lines.push(`${ctx.indent}ImGui_SetStateFloat("${escapeString(n.id)}_Val", ${fVar});`);
    }
  },

  "slider-v": {
    emit(ctx, n: SliderVNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      const fVar = `f${safeId(n.id)}`;
      ctx.lines.push(
        `${ctx.indent}float ${fVar} = ImGui_DoSliderVerticalExt("${escapeString(n.id)}", ImGui_GetStateFloat("${escapeString(n.id)}_Val", ${n.defaultValue || "0.5f"}), ${n.min || "0.0f"}, ${n.max || "1.0f"}, ${n.step || "0.1f"}, ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.lines.push(`${ctx.indent}ImGui_SetStateFloat("${escapeString(n.id)}_Val", ${fVar});`);
    }
  },

  "multi-toggle": {
    emit(ctx, n: MultiToggleNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      const items = (n.itemsText || "").split("|").filter(Boolean);
      for (const item of items) {
        ctx.lines.push(`${ctx.indent}ImGui_AddItemString("${escapeString(item)}");`);
      }
      const iVar = `i${safeId(n.id)}`;
      ctx.lines.push(
        `${ctx.indent}int ${iVar} = ImGui_DoMultiToggleExt("${escapeString(n.id)}", ImGui_GetStateInt("${escapeString(n.id)}_Sel", 0), ${n.columns || 3}, cVector2f(0,0), ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.lines.push(`${ctx.indent}ImGui_SetStateInt("${escapeString(n.id)}_Sel", ${iVar});`);
    }
  },

  "multi-select": {
    emit(ctx, n: MultiSelectNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      const items = (n.itemsText || "").split("|").filter(Boolean);
      for (const item of items) {
        ctx.lines.push(`${ctx.indent}ImGui_AddItemString("${escapeString(item)}");`);
      }
      const iVar = `i${safeId(n.id)}`;
      ctx.lines.push(
        `${ctx.indent}int ${iVar} = ImGui_DoMultiSelectExt("${escapeString(n.id)}", ImGui_GetStateInt("${escapeString(n.id)}_Sel", 0), ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
      ctx.lines.push(`${ctx.indent}ImGui_SetStateInt("${escapeString(n.id)}_Sel", ${iVar});`);
    }
  },

  label: {
    emit(ctx, n: LabelNode) {
      const mul = Number.isFinite(n.fontSizeMul) ? n.fontSizeMul : 1;
      ctx.lines.push(
        `${ctx.indent}ImGui_DoLabel("${escapeString(n.caption)}", ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)}, ${mul.toFixed(1)}f);`
      );
    }
  },

  "text-frame": {
    emit(ctx, n: TextFrameNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}ImGui_DoTextFrameExt("${escapeString(n.text || n.caption)}", 0, 0, 0, ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
    }
  },

  image: {
    emit(ctx, n: ImageNode) {
      const fn = n.correctAspect ? "ImGui_DoImageCorrectAspect" : "ImGui_DoImage";
      ctx.lines.push(
        `${ctx.indent}${fn}(cImGuiGfx("${escapeString(n.gfx || n.caption)}"), ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
    }
  },

  gauge: {
    emit(ctx, n: GaugeNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}ImGui_DoGauge(${v}, ${n.fillExpr || "0.5f"}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
    }
  },

  fill: {
    emit(ctx, n: FillNode) {
      ctx.lines.push(
        `${ctx.indent}ImGui_DoImage(cImGuiGfx(""), ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
    }
  },

  frame: {
    emit(ctx, n: FrameNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}ImGui_DoFrame(${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
    }
  },

  // ---- Background / overlay (no pos/size — call the helper directly) ----

  "bg-scanlines": {
    emit(ctx, _n: BgScanlinesNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_Scanlines();`);
    }
  },

  "bg-backdrop": {
    emit(ctx, _n: BgBackdropNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_Backdrop();`);
    }
  },

  "bg-flat-color": {
    emit(ctx, _n: BgFlatColorNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_FlatColor();`);
    }
  },

  "bg-ornament-tl": {
    emit(ctx, _n: BgOrnamentTLNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentTopLeft();`);
    }
  },

  "bg-ornament-tr": {
    emit(ctx, _n: BgOrnamentTRNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentTopRight();`);
    }
  },

  "bg-ornament-br": {
    emit(ctx, _n: BgOrnamentBRNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentBottomRight();`);
    }
  },

  "bg-ornament-bl": {
    emit(ctx, _n: BgOrnamentBLNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentBottomLeft();`);
    }
  },

  // ---- Helpers ----------------------------------------------------------

  "station-numpad": {
    emit(ctx, n: NumpadNode) {
      const digits = Number.isFinite(n.digits) ? n.digits : 4;
      ctx.lines.push(
        `${ctx.indent}if (StationGui_Numpad("${escapeString(n.caption)}", ${digits}, 0.2f, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)}))`
      );
      ctx.lines.push(`${ctx.indent}{`);
      ctx.lines.push(`${ctx.indent}\ttString sInput = StationGui_GetNumpadInput();`);
      ctx.lines.push(`${ctx.indent}\t// TODO: validate input`);
      ctx.lines.push(`${ctx.indent}}`);
    }
  },

  "station-text-reader-single": {
    emit(ctx, n: TextReaderNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}StationGui_TextReaderSingle("${escapeString(n.caption)}", "${escapeString(n.text || n.caption)}", ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)});`
      );
    }
  },

  // ---- Advanced ---------------------------------------------------------

  "advanced-imgui": {
    emit(ctx, n: AdvancedNode) {
      ctx.lines.push(`${ctx.indent}// Advanced custom code block: ${n.id}`);
      for (const line of String(n.code || "").split(/\r?\n/)) {
        ctx.lines.push(`${ctx.indent}${line}`);
      }
    }
  }
};
