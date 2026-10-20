// Runs inside VS Code's extension test host, not the user's existing editor.
const vscode = require('vscode');
const fs = require('node:fs');
const path = require('node:path');
exports.run = async function () {
  const root = path.resolve(__dirname, '..'), output = path.join(root, '.cache/vscode-smoke');
  fs.mkdirSync(output, { recursive: true });
  const extension = vscode.extensions.getExtension('soma-modding.soma-gui-designer');
  if (!extension) throw new Error('Development extension is missing');
  await extension.activate();
  const uri = vscode.Uri.file(path.join(root, 'test/fixtures/parity.somagui.json'));
  await vscode.commands.executeCommand('vscode.openWith', uri, 'somaGui.editor');
  const deadline = Date.now() + 45000;
  let report;
  while (Date.now() < deadline) {
    report = (await vscode.commands.executeCommand('somaGui.development.previewReports'))[uri.toString()];
    if (report?.error) break;
    if (report?.readyResources >= 24 && !report.diagnostics.length) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ version: extension.packageJSON.version, report }, null, 2));
  if (!report || report.error || report.diagnostics.length || report.readyResources < 24 || report.quads < 100) throw new Error(`Webview did not settle: ${JSON.stringify(report)}`);
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
};
