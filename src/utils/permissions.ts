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
 * Ambil representasi NOMOR TELEPON (bukan LID) dari peserta grup.
 * WhatsApp memakai LID (identitas anonim) selain nomor asli; nomor asli
 * biasanya ada di field `phoneNumber` atau JID @s.whatsapp.net.
 */
export function preferredPhoneFromParticipant(p: any): string | null {
  if (!p) return null;

  if (typeof p.phoneNumber === 'string') {
    const n = extractJidNumber(p.phoneNumber);
    if (n) return n;
  }

  for (const field of [p.id, p.jid]) {
    if (typeof field === 'string' && field.includes('@') && !field.endsWith('@lid')) {
      const n = extractJidNumber(field);
      if (n) return n;
    }
  }

  return null;
}

/**
 * Peta nomor -> nomor telepon (PN) untuk seluruh peserta grup.
 * Kunci mencakup semua varian (LID & PN) sehingga lookup dari JID/nomor apa pun
 * bisa menghasilkan nomor telepon asli bila tersedia.
 */
export function buildPhoneMap(metadata: any): Map<string, string> {
  const map = new Map<string, string>();
  const participants = metadata?.participants;
  if (!Array.isArray(participants)) return map;

  for (const p of participants) {
    const phone = preferredPhoneFromParticipant(p);
    if (!phone) continue;
    for (const field of [p.id, p.lid, p.jid, p.phoneNumber]) {
      const n = typeof field === 'string' ? extractJidNumber(field) : '';
      if (n) map.set(n, phone);
    }
  }
  return map;
}

/**
 * Ubah JID/nomor apa pun menjadi nomor telepon memakai peta grup.
 * Bila tidak ada di peta, mengembalikan bagian angkanya (perilaku lama).
 */
export function resolvePhoneNumber(
  jidOrNumber: string | null | undefined,
  phoneMap?: Map<string, string> | null
): string | null {
  if (!jidOrNumber) return null;
  const digits = extractJidNumber(String(jidOrNumber));
  if (!digits) return null;
  return phoneMap?.get(digits) ?? digits;
}

/**
 * Pilih nomor telepon dari beberapa kandidat JID untuk satu orang.
 * Urutan prioritas:
 *   1) Petakan lewat peta grup (LID -> nomor asli).
 *   2) Varian JID yang bukan LID (@s.whatsapp.net dsb).
 *   3) Digit pertama yang ada (fallback).
 * JID grup (@g.us) selalu diabaikan.
 */
export function resolvePhoneFromCandidates(
  candidates: Array<string | null | undefined>,
  phoneMap?: Map<string, string> | null
): string | null {
  const clean = candidates
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .filter((c) => !c.endsWith('@g.us'));

  const digits = Array.from(
    new Set(clean.map((c) => extractJidNumber(c)).filter((d) => d.length > 0))
  );

  if (phoneMap) {
    for (const d of digits) {
      const mapped = phoneMap.get(d);
      if (mapped) return mapped;
    }
  }

  for (const c of clean) {
    if (c.includes('@') && !c.endsWith('@lid')) {
      const d = extractJidNumber(c);
      if (d) return d;
    }
  }

  return digits[0] ?? null;
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
