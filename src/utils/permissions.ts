import { config } from '../config/env';
import { extractJidNumber } from './parser';

/**
 * Kumpulkan semua kemungkinan JID pengirim.
 * WhatsApp kini memakai LID (@lid) selain nomor telepon (@s.whatsapp.net),
 * sehingga kita perlu memeriksa semua varian agar deteksi owner tetap akurat.
 */
export function collectSenderJids(msg: any): string[] {
  const key = msg?.key ?? {};
  const pushName = msg?.pushName;
  const verifiedBizName = msg?.verifiedBizName;
  
  const jids = [
    key.participant,
    key.participantPn,
    key.participantLid,
    key.senderPn,
    key.senderLid,
    key.remoteJid,
    key.fromMe ? null : key.participant || key.remoteJid,
  ].filter((j): j is string => typeof j === 'string' && j.length > 0);
  
  // Log struktur lengkap untuk debug
  if (process.env.LOG_LEVEL === 'debug') {
    console.log('[collectSenderJids] key:', JSON.stringify(key, null, 2));
    console.log('[collectSenderJids] pushName:', pushName);
    console.log('[collectSenderJids] collected jids:', jids);
  }
  
  return Array.from(new Set(jids));
}

/**
 * Cek apakah salah satu JID pengirim adalah owner.
 */
export function isOwnerFromJids(jids: string[], msg?: any): boolean {
  const ownerNumber = config.ownerNumber;
  
  // 1. Cek semua JID
  for (const jid of jids) {
    if (extractJidNumber(jid) === ownerNumber) return true;
  }
  
  // 2. Jika pesan dikirim dari diri sendiri (fromMe === true) dan nomor bot/owner sama
  if (msg?.key?.fromMe) {
    return true;
  }
  
  return false;
}

/**
 * Cek apakah pengirim adalah admin grup (berdasarkan salah satu JID).
 */
export function isAdminFromJids(jids: string[], groupMetadata: any): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  for (const p of groupMetadata.participants) {
    const participantJids = [p.id, p.phoneNumber, p.lid, p.id ? p.id.split(':')[0] + '@s.whatsapp.net' : null].filter(
      (x: any): x is string => typeof x === 'string' && x.length > 0
    );
    const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
    if (!isAdmin) continue;
    for (const pj of participantJids) {
      if (jids.includes(pj)) return true;
    }
  }
  return false;
}

/**
 * Cek apakah bot adalah admin grup.
 */
export function isBotAdminFromMetadata(botJids: string[], groupMetadata: any): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  for (const p of groupMetadata.participants) {
    const participantJids = [p.id, p.phoneNumber, p.lid, p.id ? p.id.split(':')[0] + '@s.whatsapp.net' : null].filter(
      (x: any): x is string => typeof x === 'string' && x.length > 0
    );
    const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
    if (!isAdmin) continue;
    for (const pj of participantJids) {
      if (botJids.includes(pj)) return true;
    }
  }
  return false;
}

export function isOwner(senderJid: string): boolean {
  const senderNumber = extractJidNumber(senderJid);
  return senderNumber === config.ownerNumber;
}

/**
 * Cek apakah pengirim adalah admin grup.
 */
export function isGroupAdmin(senderJid: string, groupMetadata: any): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const participant = groupMetadata.participants.find((p: any) => p.id === senderJid);
  return (
    participant &&
    (participant.admin === 'admin' || participant.admin === 'superadmin')
  );
}

/**
 * Cek apakah bot adalah admin grup.
 */
export function isBotGroupAdmin(botJid: string, groupMetadata: any): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const participant = groupMetadata.participants.find((p: any) => p.id === botJid);
  return (
    participant &&
    (participant.admin === 'admin' || participant.admin === 'superadmin')
  );
}
