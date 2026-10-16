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
 * Ambil semua identitas angka dari sekumpulan JID.
 * WhatsApp bisa memakai format @s.whatsapp.net (nomor) maupun @lid (anonim),
 * sehingga perbandingan dilakukan pada bagian angkanya agar cocok lintas format.
 */
function jidNumbers(jids: Array<string | null | undefined>): Set<string> {
  const set = new Set<string>();
  for (const jid of jids) {
    if (typeof jid !== 'string' || jid.length === 0) continue;
    const num = extractJidNumber(jid);
    if (num) set.add(num);
  }
  return set;
}

export function participantIsAdmin(p: any): boolean {
  return (
    p?.admin === 'admin' ||
    p?.admin === 'superadmin' ||
    p?.isAdmin === true ||
    p?.isSuperAdmin === true
  );
}

/**
 * Cek apakah pengirim adalah admin grup (berdasarkan salah satu JID).
 * Membandingkan bagian angka dari semua varian JID (id, lid, jid, phoneNumber).
 */
export function isAdminFromJids(jids: string[], groupMetadata: any): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const senderNumbers = jidNumbers(jids);
  if (senderNumbers.size === 0) return false;

  for (const p of groupMetadata.participants) {
    if (!participantIsAdmin(p)) continue;
    const pNumbers = jidNumbers([p.id, p.lid, p.jid, p.phoneNumber]);
    for (const n of pNumbers) {
      if (senderNumbers.has(n)) return true;
    }
  }
  return false;
}

/**
 * Cek apakah bot adalah admin grup.
 * Membandingkan bagian angka dari semua varian JID bot dengan varian JID peserta admin.
 */
export function isBotAdminFromMetadata(botJids: string[], groupMetadata: any): boolean {
  if (!groupMetadata || !groupMetadata.participants) return false;
  const botNumbers = jidNumbers(botJids);
  if (botNumbers.size === 0) return false;

  for (const p of groupMetadata.participants) {
    if (!participantIsAdmin(p)) continue;
    const pNumbers = jidNumbers([p.id, p.lid, p.jid, p.phoneNumber]);
    for (const n of pNumbers) {
      if (botNumbers.has(n)) return true;
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
