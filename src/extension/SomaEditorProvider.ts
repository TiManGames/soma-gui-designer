import * as vscode from "vscode";
import type { WebviewToHost, HostToWebview, GfxConfig } from "@core/protocol";
import { getHtml } from "./getHtml";
import { GfxIndex } from "./GfxIndex";

/** Local development diagnostics, used by the real webview integration check. */
export const previewReports = new Map<string, { diagnostics: string[]; error: string; quads: number; readyResources: number }>();

/** Read the current WYSIWYG-related config into the shape sent to the webview. */
function readGfxConfig(): GfxConfig {
  const cfg = vscode.workspace.getConfiguration("somaGui");
  return { wysiwygEnabled: cfg.get<boolean>("wysiwyg.enabled", true) };
}

/** Absolute graphics-folder uris used to widen the webview's localResourceRoots. */
function graphicsRoots(): vscode.Uri[] {
  const cfg = vscode.workspace.getConfiguration("somaGui");
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri;
  const roots: vscode.Uri[] = [];
  for (const key of ["baseGameGraphicsPath", "modGraphicsPath", "baseGameFontsPath", "modFontsPath"] as const) {
    const p = (cfg.get<string>(key) ?? "").trim();
    if (!p) continue;
    const uri = /^([a-zA-Z]:[\\/]|[\\/])/.test(p) ? vscode.Uri.file(p) : ws ? vscode.Uri.joinPath(ws, p) : null;
    if (uri) { roots.push(uri); if (key.endsWith("GraphicsPath")) roots.push(vscode.Uri.joinPath(uri, "..", "fonts")); }
  }
  return roots;
}

/**
 * CustomTextEditor backing a *.somagui.json project file. The TextDocument is
 * the single source of truth: the webview edits it via full-document
 * WorkspaceEdits (driving dirty/undo/save natively), and document changes are
 * echoed back to the webview to re-render.
 */
export class SomaEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "somaGui.editor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      SomaEditorProvider.viewType,
      new SomaEditorProvider(context),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
        ...graphicsRoots()
      ]
    };
    webview.html = getHtml(webview, this.context.extensionUri);

    const post = (msg: HostToWebview) => webview.postMessage(msg);

    // Build the gfx index for this editor from the configured graphics folders.
    const gfxIndex = new GfxIndex();
    let indexReady = gfxIndex.reindex();

    // Track edits we originate so the onDidChangeTextDocument echo doesn't loop
    // back into the webview and clobber in-progress interaction.
    let updatingFromWebview = false;

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (updatingFromWebview) return;
      post({ type: "docChanged", text: document.getText() });
    });

    // Re-index and refresh the webview when the graphics paths or WYSIWYG flag
    // change. Widening localResourceRoots requires reassigning webview.options.
    const configSub = vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("somaGui")) return;
      webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview"),
          ...graphicsRoots()
        ]
      };
      indexReady = gfxIndex.reindex();
      void indexReady.then(() => post({ type: "gfxConfigChanged", config: readGfxConfig() }));
    });

    webviewPanel.onDidDispose(() => {
      previewReports.delete(document.uri.toString());
      changeSub.dispose();
      configSub.dispose();
    });

    webview.onDidReceiveMessage(async (msg: WebviewToHost) => {
      switch (msg.type) {
        case "previewStatus":
          previewReports.set(document.uri.toString(), { diagnostics: msg.diagnostics, error: msg.error, quads: msg.quads, readyResources: msg.readyResources });
          break;
        case "ready":
          post({ type: "init", text: document.getText() });
          post({ type: "gfxConfig", config: readGfxConfig() });
          break;

        case "edit":
          updatingFromWebview = true;
          try {
            await this.replaceDocument(document, msg.text);
          } finally {
            updatingFromWebview = false;
          }
          break;

        case "copy":
          await vscode.env.clipboard.writeText(msg.text);
          vscode.window.setStatusBarMessage("SOMA GUI: code copied to clipboard", 2000);
          break;

        case "writeHps":
          await this.writeHps(msg.text, msg.suggestedName);
          break;

        case "notify":
          this.notify(msg.level, msg.message);
          break;

        case "resolveGfx":
          await indexReady;
          await this.resolveGfx(webview, gfxIndex, msg.requestId, msg.gfx, post);
          break;

        case "browseGfx": {
          await indexReady;
          const roots = gfxIndex.rootUris();
          const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: "Select texture",
            defaultUri: roots[0],
            filters: { Textures: ["tga", "png", "jpg", "jpeg", "dds"] }
          });
          const picked = uris?.[0] ?? null;
          let gfxPath: string | null = null;
          if (picked) {
            gfxPath = gfxIndex.normalize(picked);
            if (!gfxPath) {
              vscode.window.showWarningMessage(
                "Selected file is outside your configured graphics folders. Set the graphics paths in Settings first."
              );
            }
          }
          post({ type: "gfxBrowseResult", requestId: msg.requestId, path: gfxPath });
          break;
        }
      }
    });
  }

  /** Resolve a gfx name and reply with a webview uri, TGA bytes, or a miss. */
  private async resolveGfx(
    webview: vscode.Webview,
    index: GfxIndex,
    requestId: string,
    gfx: string,
    post: (msg: HostToWebview) => void
  ): Promise<void> {
    const hit = index.resolve(gfx);
    if (!hit) {
      post({ type: "gfxResolved", requestId, result: { kind: "none" } });
      return;
    }
    try {
      if (hit.kind === "uri") {
        post({
          type: "gfxResolved",
          requestId,
          result: { kind: "uri", uri: webview.asWebviewUri(hit.fileUri).toString() }
        });
      } else {
        const bytes = await vscode.workspace.fs.readFile(hit.fileUri);
        post({
          type: "gfxResolved",
          requestId,
          result: hit.kind === "font"
            ? { kind: "font", text: Buffer.from(bytes).toString("utf8") }
            : { kind: hit.kind, bytes: Buffer.from(bytes).toString("base64") }
        });
      }
    } catch {
      post({ type: "gfxResolved", requestId, result: { kind: "none" } });
    }
  }

  /** Replace the whole document with new text via a WorkspaceEdit (undoable). */
  private async replaceDocument(document: vscode.TextDocument, text: string): Promise<void> {
    if (document.getText() === text) return;
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text
    );
    await vscode.workspace.applyEdit(edit);
  }

  private async writeHps(text: string, suggestedName: string): Promise<void> {
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
    const defaultUri = wsFolder
      ? vscode.Uri.joinPath(wsFolder, suggestedName)
      : vscode.Uri.file(suggestedName);
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { "HPL3 Script": ["hps"], "All files": ["*"] },
      saveLabel: "Write .hps"
    });
    if (!target) return;
    try {
      await vscode.workspace.fs.writeFile(target, Buffer.from(text, "utf8"));
      const open = "Open";
      const choice = await vscode.window.showInformationMessage(
        `Wrote ${vscode.workspace.asRelativePath(target)}`,
        open
      );
      if (choice === open) {
        const doc = await vscode.workspace.openTextDocument(target);
        await vscode.window.showTextDocument(doc);
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Could not write file: ${String(err)}`);
    }
  }

  private notify(level: "info" | "warn" | "error", message: string): void {
    if (level === "error") vscode.window.showErrorMessage(message);
    else if (level === "warn") vscode.window.showWarningMessage(message);
    else vscode.window.showInformationMessage(message);
  }
}
