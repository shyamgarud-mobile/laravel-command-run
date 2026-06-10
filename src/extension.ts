import * as vscode from 'vscode';
import * as path from 'path';
import { detectLaravelCommand, parseSignature } from './phpParser.js';
import { collectInputs, toStoredInputs, StoredInputs, SettingsOverrides } from './inputCollector.js';
import { buildCommand } from './commandBuilder.js';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'laravelCommandRun.run',
    async (uri?: vscode.Uri) => {
      // 1. Resolve target PHP file
      const fileUri = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!fileUri || path.extname(fileUri.fsPath).toLowerCase() !== '.php') {
        vscode.window.showInformationMessage('No PHP file selected.');
        return;
      }

      // 2. Read file content
      let content: string;
      try {
        const bytes = await vscode.workspace.fs.readFile(fileUri);
        content = Buffer.from(bytes).toString('utf-8');
      } catch (err) {
        vscode.window.showErrorMessage(`Could not read file: ${err}`);
        return;
      }

      // 3. Detect Laravel command
      const info = detectLaravelCommand(content);
      if (!info.isLaravelCommand) {
        vscode.window.showInformationMessage('Laravel command not found');
        return;
      }

      // 4. Parse signature
      const parsed = info.signature
        ? parseSignature(info.signature)
        : { commandName: info.commandName ?? '', arguments: [], options: [] };

      // 5. Read global settings — "yes"/"no" lock the value and skip the prompt
      const config = vscode.workspace.getConfiguration('laravelCommandRun');
      const useTenancySetting = config.get<string>('useTenancy', 'ask');
      const tenantIdSetting   = config.get<string>('tenantId', '');
      const clearLogSetting   = config.get<string>('clearLog', 'ask');

      const overrides: SettingsOverrides = {};
      if (useTenancySetting === 'yes') overrides.useTenancy = true;
      if (useTenancySetting === 'no')  overrides.useTenancy = false;
      if (tenantIdSetting.trim() !== '') overrides.tenantId = tenantIdSetting.trim();
      if (clearLogSetting === 'yes') overrides.clearLog = true;
      if (clearLogSetting === 'no')  overrides.clearLog = false;

      // 6. Load previously stored inputs for this command (pre-fills prompts)
      const storageKey = `laravelCommandRun.inputs.${parsed.commandName}`;
      const stored = context.globalState.get<StoredInputs>(storageKey);

      // 7. Collect user inputs — locked values skip prompt, others pre-fill from last run
      const inputs = await collectInputs(parsed, stored, overrides);
      if (!inputs) return;

      // 8. Save inputs for next run
      await context.globalState.update(storageKey, toStoredInputs(inputs));

      // 9. Build command string
      const command = buildCommand(parsed, inputs);

      // 10. Find artisan project root
      const cwd = await findArtisanRoot(fileUri);

      // 11. Clear laravel.log if requested
      if (inputs.clearLog && cwd) {
        const logUri = vscode.Uri.file(path.join(cwd, 'storage', 'logs', 'laravel.log'));
        try {
          await vscode.workspace.fs.writeFile(logUri, new Uint8Array());
        } catch {
          // Log file may not exist yet — silently ignore
        }
      }

      // 11. Reuse or create terminal
      const TERMINAL_NAME = 'Laravel Artisan';
      let terminal = vscode.window.terminals.find(
        (t) => t.name === TERMINAL_NAME && t.exitStatus === undefined
      );
      if (!terminal) {
        terminal = vscode.window.createTerminal({ name: TERMINAL_NAME, cwd });
      }

      // 12. Run command
      terminal.show(false);
      terminal.sendText(command, true);

      // 13. Open laravel.log beside the current editor, scrolled to the bottom
      if (cwd) {
        const logUri = vscode.Uri.file(path.join(cwd, 'storage', 'logs', 'laravel.log'));
        try {
          const doc = await vscode.workspace.openTextDocument(logUri);
          const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
            preview: false,
          });
          const lastLine = doc.lineCount - 1;
          const lastChar = doc.lineAt(lastLine).range.end;
          editor.revealRange(
            new vscode.Range(lastLine, lastChar.character, lastLine, lastChar.character),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport
          );
        } catch {
          // Log file doesn't exist yet — ignore
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function findArtisanRoot(fileUri: vscode.Uri): Promise<string | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const stopAt = workspaceFolders?.[0]?.uri.fsPath ?? path.parse(fileUri.fsPath).root;

  let dir = path.dirname(fileUri.fsPath);

  while (dir.length >= stopAt.length) {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(path.join(dir, 'artisan')));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return workspaceFolders?.[0]?.uri.fsPath;
}
