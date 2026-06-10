import * as vscode from 'vscode';
import { ParsedSignature } from './phpParser.js';

export interface CollectedInputs {
  useTenancy: boolean;
  tenantId: string | null;
  argumentValues: Map<string, string>;
  optionValues: Map<string, string | boolean>;
  clearLog: boolean;
}

// Serialisable form stored in globalState
export interface StoredInputs {
  useTenancy: boolean;
  tenantId: string | null;
  argumentValues: Record<string, string>;
  optionValues: Record<string, string | boolean>;
  clearLog: boolean;
}

// Values locked by global settings — these skip their prompt entirely
export interface SettingsOverrides {
  useTenancy?: boolean;   // defined = skip prompt, use this value
  tenantId?: string | null; // defined = skip prompt, use this value
  clearLog?: boolean;     // defined = skip prompt, use this value
}

export async function collectInputs(
  parsed: ParsedSignature,
  stored?: StoredInputs,
  overrides?: SettingsOverrides
): Promise<CollectedInputs | null> {

  // Step 1: Tenancy? — skip if locked by settings
  let useTenancy: boolean;
  if (overrides?.useTenancy !== undefined) {
    useTenancy = overrides.useTenancy;
  } else {
    const lastTenancy = stored?.useTenancy ?? false;
    const tenancyItems = [
      { label: 'No',  description: 'Run directly with php artisan' },
      { label: 'Yes', description: 'Run via php artisan tenants:run' },
    ];
    const tenancyPick = await vscode.window.showQuickPick(tenancyItems, {
      title: 'Use Multi-Tenancy?',
      placeHolder: 'Select whether to use stancl/tenancy tenants:run',
      ignoreFocusOut: true,
      activeItems: [tenancyItems[lastTenancy ? 1 : 0]],
    } as vscode.QuickPickOptions);
    if (!tenancyPick) return null;
    useTenancy = (tenancyPick as { label: string }).label === 'Yes';
  }

  // Step 2: Tenant ID — skip if locked by settings
  let tenantId: string | null = null;
  if (useTenancy) {
    if (overrides?.tenantId !== undefined) {
      tenantId = overrides.tenantId;
    } else {
      const input = await vscode.window.showInputBox({
        title: 'Tenant ID',
        prompt: 'Enter the tenant ID (leave empty to run for all tenants)',
        placeHolder: 'e.g. 8075a580-1cb8-11e9-8822-49c5d8f8ff23',
        value: stored?.tenantId ?? undefined,
        ignoreFocusOut: true,
      });
      if (input === undefined) return null;
      tenantId = input.trim() || null;
    }
  }

  // Step 3: Arguments — always prompt, pre-fill with last used values
  const argumentValues = new Map<string, string>();
  for (const arg of parsed.arguments) {
    const lastValue = stored?.argumentValues[arg.name];
    const fallback = arg.isRequired ? undefined : (arg.defaultValue ?? undefined);
    const prefill = lastValue !== undefined ? lastValue : fallback;

    const label = `${arg.name}${arg.isRequired ? ' (required)' : ' (optional)'}`;
    const input = await vscode.window.showInputBox({
      title: `Argument: ${label}`,
      prompt: arg.description || `Value for argument "${arg.name}"`,
      placeHolder: arg.isRequired
        ? 'Required'
        : `Optional — default: ${arg.defaultValue ?? 'none'}`,
      value: prefill,
      ignoreFocusOut: true,
      validateInput: arg.isRequired
        ? (v) => (v.trim() === '' ? 'This argument is required' : null)
        : undefined,
    });
    if (input === undefined) return null;
    if (input.trim() !== '') {
      argumentValues.set(arg.name, input.trim());
    }
  }

  // Step 4: Options — always prompt, pre-fill with last used values
  const optionValues = new Map<string, string | boolean>();
  for (const opt of parsed.options) {
    if (opt.isFlag) {
      const lastFlag = stored?.optionValues[opt.name];
      const wasYes = lastFlag === true || lastFlag === 'true';
      const flagItems = [
        { label: 'Yes', description: `Include --${opt.name}` },
        { label: 'No',  description: `Omit --${opt.name}` },
      ];
      const flagPick = await vscode.window.showQuickPick(flagItems, {
        title: `Option: --${opt.name}`,
        placeHolder: opt.description || `Include --${opt.name}?`,
        ignoreFocusOut: true,
        activeItems: [flagItems[wasYes ? 0 : 1]],
      } as vscode.QuickPickOptions);
      if (flagPick === undefined) return null;
      optionValues.set(opt.name, (flagPick as { label: string }).label === 'Yes');
    } else {
      const lastValue = stored?.optionValues[opt.name];
      const fallback = opt.isRequired ? undefined : (opt.defaultValue ?? undefined);
      const prefill = lastValue !== undefined ? String(lastValue) : fallback;

      const label = `--${opt.name}${opt.isRequired ? ' (required)' : ' (optional)'}`;
      const input = await vscode.window.showInputBox({
        title: `Option: ${label}`,
        prompt: opt.description || `Value for --${opt.name}`,
        placeHolder: opt.isRequired
          ? 'Required'
          : `Optional — default: ${opt.defaultValue ?? 'none'}`,
        value: prefill,
        ignoreFocusOut: true,
        validateInput: opt.isRequired
          ? (v) => (v.trim() === '' ? `--${opt.name} requires a value` : null)
          : undefined,
      });
      if (input === undefined) return null;
      if (input.trim() !== '') {
        optionValues.set(opt.name, input.trim());
      }
    }
  }

  // Step 5: Clear log? — skip if locked by settings
  let clearLog: boolean;
  if (overrides?.clearLog !== undefined) {
    clearLog = overrides.clearLog;
  } else {
    const lastClearLog = stored?.clearLog ?? false;
    const clearLogItems = [
      { label: 'No',  description: 'Keep existing laravel.log contents' },
      { label: 'Yes', description: 'Delete storage/logs/laravel.log before running' },
    ];
    const clearLogPick = await vscode.window.showQuickPick(clearLogItems, {
      title: 'Clear log before command run?',
      placeHolder: 'Clear storage/logs/laravel.log before running?',
      ignoreFocusOut: true,
      activeItems: [clearLogItems[lastClearLog ? 1 : 0]],
    } as vscode.QuickPickOptions);
    if (!clearLogPick) return null;
    clearLog = (clearLogPick as { label: string }).label === 'Yes';
  }

  return { useTenancy, tenantId, argumentValues, optionValues, clearLog };
}

export function toStoredInputs(inputs: CollectedInputs): StoredInputs {
  return {
    useTenancy: inputs.useTenancy,
    tenantId: inputs.tenantId,
    argumentValues: Object.fromEntries(inputs.argumentValues),
    optionValues: Object.fromEntries(inputs.optionValues),
    clearLog: inputs.clearLog,
  };
}
