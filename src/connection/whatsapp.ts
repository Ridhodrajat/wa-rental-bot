import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  proto,
  GroupMetadata,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { config } from '../config/env';
import logger from '../utils/logger';
import { handleIncomingMessage } from '../handlers/messageHandler';
import { handleGroupParticipantsUpdate } from '../handlers/groupHandler';
import { onConnectionUpdate } from '../handlers/connectionHandler';

/**
 * Manajemen koneksi WhatsApp menggunakan Baileys.
 *
 * CATATAN RISIKO:
 * Baileys adalah library tidak resmi. Penggunaan dapat berpotensi melanggar
 * ketentuan layanan WhatsApp. Hindari spam, pengiriman massal tanpa izin,
 * atau perilaku yang dapat menyebabkan pemblokiran nomor.
 */

let sock: WASocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 20;

// Pencegahan pemrosesan ganda pesan
const processedMessages = new Set<string>();
const MESSAGE_CACHE_LIMIT = 5000;

function markProcessed(msgId: string): boolean {
  if (processedMessages.has(msgId)) return false;
  processedMessages.add(msgId);
  if (processedMessages.size > MESSAGE_CACHE_LIMIT) {
    // Hapus entri paling awal
    const first = processedMessages.values().next().value;
    if (first) processedMessages.delete(first);
  }
  return true;
}

export async function startWhatsApp(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ version }, 'Memulai koneksi WhatsApp');

  sock = makeWASocket({
    version,
    logger: logger.child({ module: 'baileys' }) as any,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    browser: ['WA Rental Bot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  // Simpan kredensial saat update
  sock.ev.on('creds.update', saveCreds);

  // Handler update koneksi
  sock.ev.on('connection.update', (update) => {
    onConnectionUpdate(update, sock!, () => {
      reconnectAttempts = 0;
    });
  });

  // Handler pesan masuk
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;
    for (const msg of m.messages) {
      try {
        const msgId = msg.key.id ?? '';
        if (msgId && !markProcessed(msgId)) {
          logger.debug({ msgId }, 'Pesan duplikat diabaikan');
          continue;
        }
        await handleIncomingMessage(sock!, msg as any);
      } catch (error) {
        logger.error({ error }, 'Error saat memproses pesan (diisolasi)');
      }
    }
  });

  // Handler perubahan peserta grup (welcome/goodbye)
  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupParticipantsUpdate(sock!, update as any);
    } catch (error) {
      logger.error({ error }, 'Error pada update peserta grup (diisolasi)');
    }
  });

  // Handler grup baru ditambahkan (bot diinvite)
  sock.ev.on('groups.upsert', async (groups) => {
    try {
      const { handleGroupsUpsert } = await import('../handlers/groupHandler');
      await handleGroupsUpsert(sock!, groups);
    } catch (error) {
      logger.error({ error }, 'Error pada groups.upsert (diisolasi)');
    }
  });

  return sock;
}

export function getSocket(): WASocket {
  if (!sock) throw new Error('Socket WhatsApp belum diinisialisasi');
  return sock;
}

export function isConnected(): boolean {
  return sock !== null && (sock.user != null);
}

export function getBotJid(): string | null {
  if (!sock || !sock.user) return null;
  return sock.user.id;
}

/**
 * Cache metadata grup agar tidak membanjiri WhatsApp dengan query metadata.
 * TTL default 60 detik. Cukup untuk menangani burst pesan di grup.
 */
const groupMetadataCache = new Map<
  string,
  { metadata: GroupMetadata; expiresAt: number }
>();
const GROUP_METADATA_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 500;

function cleanupGroupMetadataCache(): void {
  if (groupMetadataCache.size <= MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of groupMetadataCache.entries()) {
    if (entry.expiresAt < now) {
      groupMetadataCache.delete(key);
    }
  }
}

/**
 * Ambil metadata grup dengan error handling dan cache.
 */
export async function getGroupMetadata(
  jid: string
): Promise<GroupMetadata | null> {
  if (!sock) return null;

  const cached = groupMetadataCache.get(jid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.metadata;
  }

  try {
    const metadata = await Promise.race([
      sock.groupMetadata(jid),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed Out')), 8_000)
      ),
    ]);
    groupMetadataCache.set(jid, {
      metadata,
      expiresAt: Date.now() + GROUP_METADATA_TTL_MS,
    });
    cleanupGroupMetadataCache();
    return metadata;
  } catch (error) {
    logger.warn({ error, jid }, 'Gagal mengambil metadata grup, gunakan cache/default');
    // Kalau cache expired masih ada, pakai cache lama sebagai fallback
    if (cached) return cached.metadata;
    return null;
  }
}

export function invalidateGroupMetadataCache(jid: string): void {
  groupMetadataCache.delete(jid);
}

export function getReconnectAttempts(): number {
  return reconnectAttempts;
}

export function incrementReconnectAttempts(): number {
  return ++reconnectAttempts;
}

export function resetReconnectAttempts(): void {
  reconnectAttempts = 0;
}

export function getMaxReconnectAttempts(): number {
  return MAX_RECONNECT_ATTEMPTS;
}
