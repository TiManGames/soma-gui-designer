import * as vscode from "vscode";
import { SomaEditorProvider, previewReports } from "./SomaEditorProvider";
import { createDefaultDocument } from "@core/model/createDefaultDocument";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(SomaEditorProvider.register(context));
  if (context.extensionMode !== vscode.ExtensionMode.Production) {
    context.subscriptions.push(vscode.commands.registerCommand("somaGui.development.previewReports", () => Object.fromEntries(previewReports)));
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("somaGui.newProject", () => newProject())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("somaGui.toggleWysiwyg", () => {
      const cfg = vscode.workspace.getConfiguration("somaGui");
      const current = cfg.get<boolean>("wysiwyg.enabled", true);
      cfg.update("wysiwyg.enabled", !current, vscode.ConfigurationTarget.Global);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("somaGui.configureGraphics", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:soma-modding.soma-gui-designer"
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("somaGui.setBaseGameGraphicsPath", () =>
      pickGraphicsFolder("baseGameGraphicsPath", "Select base game graphics folder")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("somaGui.setModGraphicsPath", () =>
      pickGraphicsFolder("modGraphicsPath", "Select mod graphics folder")
    )
  );
}

export function deactivate(): void {
  /* nothing to clean up */
}

/**
 * Create a new *.somagui.json seeded with the default document and open it in
 * the SOMA GUI Designer custom editor.
 */
async function pickGraphicsFolder(
  settingKey: "baseGameGraphicsPath" | "modGraphicsPath",
  prompt: string
): Promise<void> {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select",
    title: prompt
  });
  if (!uris || uris.length === 0) return;
  const selected = uris[0].fsPath;
  await vscode.workspace
    .getConfiguration("somaGui")
    .update(settingKey, selected, vscode.ConfigurationTarget.Global);
  vscode.window.setStatusBarMessage(`SOMA GUI: ${settingKey} set to ${selected}`, 3000);
}

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
