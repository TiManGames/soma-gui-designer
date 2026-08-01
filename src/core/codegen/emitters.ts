import type {
  AdvancedNode,
  FillNode,
  GaugeNode,
  GroupNode,
  ImageNode,
  LabelNode,
  NumpadNode,
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
  /** Emit the children of `node` at the given indent, marking them as group-parented. */
  emitChildren: (node: WidgetNode, indent: string) => void;
}

export interface Emitter<N extends WidgetNode> {
  emit: (ctx: EmitCtx, node: N) => void;
}

type EmitterMap = { [K in WidgetType]: Emitter<Extract<WidgetNode, { type: K }>> };

// Each emitter mirrors the corresponding case in legacy/app.js:806-873 verbatim.
export const EMITTERS: EmitterMap = {
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

  "station-button": {
    emit(ctx, n: StationButtonNode) {
      const v = emitDataVar(ctx.lines, n, ctx.indent);
      ctx.lines.push(
        `${ctx.indent}if (ImGui_DoButtonExt("${escapeString(n.id)}", "${escapeString(n.caption)}", ${v}, ${posExpr(n, ctx.parentIsGroup)}, ${sizeExpr(n, ctx.parentIsGroup)}))`
      );
      ctx.lines.push(`${ctx.indent}{`);
      ctx.lines.push(`${ctx.indent}\t// TODO: ${n.id} pressed`);
      ctx.lines.push(`${ctx.indent}}`);
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

  "advanced-imgui": {
    emit(ctx, n: AdvancedNode) {
      ctx.lines.push(`${ctx.indent}// Advanced custom code block: ${n.id}`);
      for (const line of String(n.code || "").split(/\r?\n/)) {
        ctx.lines.push(`${ctx.indent}${line}`);
      }
    }
  }
};
