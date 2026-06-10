import { ParsedSignature } from './phpParser.js';
import { CollectedInputs } from './inputCollector.js';

export function buildCommand(parsed: ParsedSignature, inputs: CollectedInputs): string {
  const { commandName } = parsed;
  const { useTenancy, tenantId, argumentValues, optionValues } = inputs;

  if (!useTenancy) {
    const parts: string[] = ['php artisan', commandName];

    for (const arg of parsed.arguments) {
      const val = argumentValues.get(arg.name);
      if (val !== undefined) {
        parts.push(shellQuote(val));
      }
    }

    for (const opt of parsed.options) {
      const val = optionValues.get(opt.name);
      if (opt.isFlag) {
        if (val === true) parts.push(`--${opt.name}`);
      } else if (val !== undefined && val !== false && val !== '') {
        parts.push(`--${opt.name}=${shellQuote(String(val))}`);
      }
    }

    return parts.join(' ');
  }

  // Tenancy mode: php artisan tenants:run email:send --tenants=ID --argument="k=v" --option="k=v"
  const parts: string[] = ['php artisan tenants:run', commandName];

  if (tenantId) {
    parts.push(`--tenants=${shellQuote(tenantId)}`);
  }

  for (const arg of parsed.arguments) {
    const val = argumentValues.get(arg.name);
    if (val !== undefined) {
      parts.push(`--argument="${arg.name}=${escapeInnerQuotes(val)}"`);
    }
  }

  for (const opt of parsed.options) {
    const val = optionValues.get(opt.name);
    if (opt.isFlag) {
      if (val === true) parts.push(`--option="${opt.name}=1"`);
    } else if (val !== undefined && val !== false && val !== '') {
      parts.push(`--option="${opt.name}=${escapeInnerQuotes(String(val))}"`);
    }
  }

  return parts.join(' ');
}

function shellQuote(value: string): string {
  if (/[\s"'\\&|<>$`!]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function escapeInnerQuotes(value: string): string {
  return value.replace(/"/g, '\\"');
}
