import * as vscode from "vscode";
import type { WebviewToHost, HostToWebview } from "@core/protocol";
import { getHtml } from "./getHtml";

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
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview")]
    };
    webview.html = getHtml(webview, this.context.extensionUri);

    const post = (msg: HostToWebview) => webview.postMessage(msg);

    // Track edits we originate so the onDidChangeTextDocument echo doesn't loop
    // back into the webview and clobber in-progress interaction.
    let updatingFromWebview = false;

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (updatingFromWebview) return;
      post({ type: "docChanged", text: document.getText() });
    });

    webviewPanel.onDidDispose(() => changeSub.dispose());

    webview.onDidReceiveMessage(async (msg: WebviewToHost) => {
      switch (msg.type) {
        case "ready":
          post({ type: "init", text: document.getText() });
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
      }
    });
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
