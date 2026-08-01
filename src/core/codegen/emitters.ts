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
    emit(ctx, n: BgScanlinesNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_Scanlines(${n.zDepth || "10.0f"}, "${escapeString(n.file || "station/scanlines/standard_tileable")}");`);
    }
  },

  "bg-backdrop": {
    emit(ctx, n: BgBackdropNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_Backdrop("${escapeString(n.file || "background_logo_pathOS")}", cVector2f(${n.relPosX || "0.1f"}, ${n.relPosY || "0.45f"}), ${n.relSize || "0.5f"}, ${n.zDepth || "0.0f"});`);
    }
  },

  "bg-flat-color": {
    emit(ctx, n: BgFlatColorNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_FlatColor(${n.zDepth || "0.0f"}, ${n.color || "cColor(0,1.0f)"});`);
    }
  },

  "bg-ornament-tl": {
    emit(ctx, n: BgOrnamentTLNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentTopLeft("${escapeString(n.file || "station/ornament/corner_topleft")}", cVector2f(0.25f), eImGuiSizeType_CorrectAspectWidthNormalized, ${n.color || "cColor_White"}, cVector2f_Zero, ${n.zDepth || "0.2f"});`);
    }
  },

  "bg-ornament-tr": {
    emit(ctx, n: BgOrnamentTRNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentTopRight("${escapeString(n.file || "station/ornament/corner_topright")}", cVector2f(0.25f), eImGuiSizeType_CorrectAspectWidthNormalized, ${n.color || "cColor(1.0f,0.75f,0.75f,1.0f)"}, cVector2f_Zero, ${n.zDepth || "0.2f"});`);
    }
  },

  "bg-ornament-br": {
    emit(ctx, n: BgOrnamentBRNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentBottomRight("${escapeString(n.file || "station/ornament/corner_bottomright")}", cVector2f(0.25f), eImGuiSizeType_CorrectAspectWidthNormalized, ${n.color || "cColor(1.0f,0.75f,0.75f,1.0f)"}, cVector2f_Zero, ${n.zDepth || "0.2f"});`);
    }
  },

  "bg-ornament-bl": {
    emit(ctx, n: BgOrnamentBLNode) {
      ctx.lines.push(`${ctx.indent}StationGuiBG_OrnamentBottomLeft("${escapeString(n.file || "station/ornament/corner_bottomleft")}", cVector2f(0.25f), eImGuiSizeType_CorrectAspectWidthNormalized, ${n.color || "cColor(1.0f,0.75f,0.75f,1.0f)"}, cVector2f_Zero, ${n.zDepth || "0.2f"});`);
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
