export interface SignatureArgument {
  name: string;
  isRequired: boolean;
  defaultValue: string | null;
  isArray: boolean;
  description: string;
}

export interface SignatureOption {
  name: string;
  shortcut: string | null;
  isFlag: boolean;
  isRequired: boolean;
  defaultValue: string | null;
  description: string;
}

export interface ParsedSignature {
  commandName: string;
  arguments: SignatureArgument[];
  options: SignatureOption[];
}

export interface LaravelCommandInfo {
  isLaravelCommand: boolean;
  signature: string | null;
  commandName: string | null;
  parsed: ParsedSignature | null;
}

export function detectLaravelCommand(content: string): LaravelCommandInfo {
  const notFound: LaravelCommandInfo = {
    isLaravelCommand: false,
    signature: null,
    commandName: null,
    parsed: null,
  };

  if (!extendsLaravelCommand(content)) {
    return notFound;
  }

  const signatureMatch = /protected\s+\$signature\s*=\s*(['"])([\s\S]*?)\1\s*;/m.exec(content);
  if (signatureMatch) {
    const signature = signatureMatch[2].trim();
    const parsed = parseSignature(signature);
    return { isLaravelCommand: true, signature, commandName: parsed.commandName, parsed };
  }

  // Fall back to $name
  const nameMatch = /protected\s+\$name\s*=\s*(['"])([\s\S]*?)\1\s*;/m.exec(content);
  if (nameMatch) {
    const commandName = nameMatch[2].trim();
    const parsed: ParsedSignature = { commandName, arguments: [], options: [] };
    return { isLaravelCommand: true, signature: null, commandName, parsed };
  }

  return notFound;
}

function extendsLaravelCommand(content: string): boolean {
  // Collect all local names that map to Illuminate\Console\Command
  const acceptedNames = new Set<string>();
  const useRe = /^use\s+Illuminate\\Console\\Command(?:\s+as\s+(\w+))?\s*;/gm;
  let m: RegExpExecArray | null;
  while ((m = useRe.exec(content)) !== null) {
    acceptedNames.add(m[1] ?? 'Command');
  }

  const extendsMatch = /\bclass\s+\w+\s+extends\s+(\\?[\w\\]+)/m.exec(content);
  if (!extendsMatch) return false;

  const extendedClass = extendsMatch[1].replace(/^\\/, '');

  if (extendedClass === 'Illuminate\\Console\\Command') return true;

  return acceptedNames.has(extendedClass);
}

export function parseSignature(raw: string): ParsedSignature {
  const firstBrace = raw.indexOf('{');
  const commandName = (firstBrace === -1 ? raw : raw.slice(0, firstBrace)).trim();

  const args: SignatureArgument[] = [];
  const opts: SignatureOption[] = [];

  const TOKEN_RE = /\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(raw)) !== null) {
    const inner = match[1].trim();

    if (inner.startsWith('--')) {
      const body = inner.slice(2);
      const optMatch = /^(?:(\w+)\|)?(\w+)(=([^:}]*))?(?:\s*:\s*(.*))?$/.exec(body);
      if (!optMatch) continue;

      const hasEquals = optMatch[3] !== undefined;
      const defaultRaw = optMatch[4]?.trim() ?? '';

      opts.push({
        name: optMatch[2],
        shortcut: optMatch[1] ?? null,
        isFlag: !hasEquals,
        isRequired: hasEquals && defaultRaw === '',
        defaultValue: hasEquals && defaultRaw !== '' ? defaultRaw : null,
        description: optMatch[5]?.trim() ?? '',
      });
    } else {
      // Supports: {name}, {name?}, {name=default}, {name*}, {from-date}, {where?}
      const argMatch = /^([\w-]+)(\*)?\s*(\?)?\s*(?:=([^:}]*))?(?:\s*:\s*(.*))?$/.exec(inner);
      if (!argMatch) continue;

      const isOptionalMark = argMatch[3] === '?';
      const hasDefault = argMatch[4] !== undefined;

      args.push({
        name: argMatch[1],
        isRequired: !isOptionalMark && !hasDefault,
        defaultValue: argMatch[4]?.trim() ?? null,
        isArray: argMatch[2] === '*',
        description: argMatch[5]?.trim() ?? '',
      });
    }
  }

  return { commandName, arguments: args, options: opts };
}
