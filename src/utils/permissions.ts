import { config } from '../config/env';
import { extractJidNumber } from './parser';
import type { proto } from '@whiskeysockets/baileys';

/**
 * Utilitas permission: cek owner, admin grup, bot admin.
 */

export function isOwner(senderJid: string): boolean {
  const senderNumber = extractJidNumber(senderJid);
  return senderNumber === config.ownerNumber;
}

/**
 * Cek apakah pengirim adalah admin grup.
 * Memerlukan metadata grup dari Baileys.
 */
export function isGroupAdmin(
  senderJid: string,
  groupMetadata: any
): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const participant = groupMetadata.participants.find(
    (p: any) => p.id === senderJid
  );
  return (
    participant &&
    (participant.admin === 'admin' || participant.admin === 'superadmin')
  );
}

/**
 * Cek apakah bot adalah admin grup.
 */
export function isBotGroupAdmin(
  botJid: string,
  groupMetadata: any
): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const participant = groupMetadata.participants.find(
    (p: any) => p.id === botJid
  );
  return (
    participant &&
    (participant.admin === 'admin' || participant.admin === 'superadmin')
  );
}
