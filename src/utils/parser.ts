import { config } from '../config/env';

export interface ParsedCommand {
  isCommand: boolean;
  commandName: string;
  args: string[];
  fullArgs: string;
}

/**
 * Parsing command mendukung format dengan prefix (.) dan tanpa prefix.
 * Prioritas:
 * 1. Jika diawali prefix, ekstrak command.
 * 2. Jika tanpa prefix, periksa apakah kata pertama cocok dengan daftar command yang valid.
 */
export function parseCommand(
  text: string,
  validCommands: Set<string>
): ParsedCommand {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isCommand: false, commandName: '', args: [], fullArgs: '' };
  }

  const prefix = config.botPrefix;
  let raw = '';

  if (trimmed.startsWith(prefix)) {
    // Dengan prefix
    raw = trimmed.slice(prefix.length).trim();
  } else {
    // Tanpa prefix: cek apakah kata pertama ada di daftar command valid
    const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase() ?? '';
    if (validCommands.has(firstWord)) {
      raw = trimmed;
    } else {
      return { isCommand: false, commandName: '', args: [], fullArgs: '' };
    }
  }

  const parts = raw.split(/\s+/);
  const commandName = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1);
  const fullArgs = parts.slice(1).join(' ').trim();

  return {
    isCommand: true,
    commandName,
    args,
    fullArgs,
  };
}

export function extractJidNumber(jid: string): string {
  return jid.replace(/[^0-9]/g, '');
}

export function isJidGroup(jid: string): boolean {
  return jid.endsWith('@g.us');
}
