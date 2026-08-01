import * as vscode from "vscode";
import { SomaEditorProvider } from "./SomaEditorProvider";
import { createDefaultDocument } from "@core/model/createDefaultDocument";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(SomaEditorProvider.register(context));

  context.subscriptions.push(
    vscode.commands.registerCommand("somaGui.newProject", () => newProject())
  );
}

export function deactivate(): void {
  /* nothing to clean up */
}

/**
 * Create a new *.somagui.json seeded with the default document and open it in
 * the SOMA GUI Designer custom editor.
 */
async function newProject(): Promise<void> {
  const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const defaultUri = wsFolder
    ? vscode.Uri.joinPath(wsFolder, "screen.somagui.json")
    : vscode.Uri.file("screen.somagui.json");

  const target = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { "SOMA GUI Project": ["somagui.json"] },
    saveLabel: "Create project"
  });
  if (!target) return;

  const seed = JSON.stringify(createDefaultDocument(), null, 2) + "\n";
  await vscode.workspace.fs.writeFile(target, Buffer.from(seed, "utf8"));
  await vscode.commands.executeCommand("vscode.openWith", target, SomaEditorProvider.viewType);
}
