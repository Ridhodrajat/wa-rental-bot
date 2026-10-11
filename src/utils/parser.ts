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

  // Split only first word for command, preserve rest with newlines
  const spaceIdx = raw.indexOf(' ');
  const commandName = (spaceIdx === -1 ? raw : raw.slice(0, spaceIdx)).toLowerCase();
  const fullArgs = spaceIdx === -1 ? '' : raw.slice(spaceIdx + 1);
  const args = fullArgs.split(/\s+/);

  return {
    isCommand: true,
    commandName,
    args,
    fullArgs,
  };
}

export function extractJidNumber(jid: string): string {
  if (!jid) return '';
  // Buang bagian setelah ':' (device suffix) dan '@' (server)
  // Contoh: 6289510214771:12@s.whatsapp.net -> 6289510214771
  const beforeAt = jid.split('@')[0];
  const numberPart = beforeAt.split(':')[0];
  return numberPart.replace(/[^0-9]/g, '');
}

export function isJidGroup(jid: string): boolean {
  return jid.endsWith('@g.us');
}
