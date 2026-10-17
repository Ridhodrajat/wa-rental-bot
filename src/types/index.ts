export type RentalStatus = 'ACTIVE' | 'EXPIRED_GRACE' | 'DELETED';

export interface GroupRecord {
  group_id: string; // JID WhatsApp grup (contoh: 1203630123456789@g.us)
  group_name: string;
  joined_at: string; // ISO String UTC
  created_at: string;
  updated_at: string;
}

export interface RentalRecord {
  id: number;
  group_id: string;
  status: RentalStatus;
  expires_at: string; // ISO String UTC
  grace_until: string; // ISO String UTC (expires_at + 30 days)
  created_by: string; // Owner number
  created_at: string;
  updated_at: string;
}

export interface RentalHistoryRecord {
  id: number;
  group_id: string;
  action: 'CREATE' | 'EXTEND' | 'EXPIRE' | 'DELETE' | 'RESTORE';
  days_added: number | null;
  previous_expires_at: string | null;
  new_expires_at: string | null;
  performed_by: string;
  note: string | null;
  created_at: string;
}

export interface ProductRecord {
  id: number;
  group_id: string;
  name: string; // Normalized (lowercase) untuk matching
  original_name: string; // Case asli saat diinput
  description: string;
  image_path: string | null; // Path lokasi file foto lokal
  created_at: string;
  updated_at: string;
}

export interface TransactionTemplateRecord {
  group_id: string;
  proses_enabled: number; // 0 or 1
  proses_template: string | null;
  done_enabled: number; // 0 or 1
  done_template: string | null;
  open_template: string | null;
  close_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface WelcomeGoodbyeRecord {
  group_id: string;
  welcome_enabled: number; // 0 or 1
  welcome_template: string | null;
  goodbye_enabled: number; // 0 or 1
  goodbye_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationSettingsRecord {
  group_id: string;
  antiwame_mode: number; // 0=off, 1=warn, 2=kick
  antilink_mode: number; // 0=off, 1=warn, 2=kick
  created_at: string;
  updated_at: string;
}

export interface GroupSettingsRecord {
  group_id: string;
  custom_data: string | null; // JSON string untuk setbot / updatesetbot
  catalog_template_id: number; // ID template catalog (1..5)
  catalog_header: string | null; // Header manual
  catalog_footer: string | null; // Footer manual
  dataorder_enabled: number; // 0 or 1, laporan order otomatis saat close
  autoopen_enabled: number; // 0 or 1
  autoopen_time: string | null; // HH:MM (zona tampilan)
  autoclose_enabled: number; // 0 or 1
  autoclose_time: string | null; // HH:MM (zona tampilan)
  autoopen_last: string | null; // tanggal operasional terakhir autoopen dijalankan
  autoclose_last: string | null; // tanggal operasional terakhir autoclose dijalankan
  created_at: string;
  updated_at: string;
}

export interface BlacklistRecord {
  id: number;
  group_id: string;
  number: string; // nomor tanpa karakter non-digit
  reason: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRecord {
  id: number;
  group_id: string;
  buyer_jid: string | null;
  buyer_number: string | null;
  product: string | null;
  amount: number; // nominal rupiah (0 bila tidak diketahui)
  source: 'manual' | 'ocr'; // asal nominal
  note: string | null;
  admin_jid: string | null;
  biz_date: string; // tanggal operasional (YYYY-MM-DD, zona tampilan)
  created_at: string;
}

export interface AntiPrivateSettingsRecord {
  enabled: number; // 0 or 1
  message_limit: number; // Max bubble chat before block/ignore
  auto_block: number; // 0 or 1
}

export interface PrivateChatCounterRecord {
  user_jid: string;
  message_count: number;
  warned: number; // 0 or 1
  blocked: number; // 0 or 1
  last_message_at: string;
}

export interface PaymentConfigRecord {
  id: number;
  content: string;
  updated_by: string;
  updated_at: string;
}

export interface UserAfkRecord {
  group_id: string;
  user_jid: string;
  reason: string | null;
  start_time: string; // ISO String UTC
}

export type Role = 'OWNER' | 'GROUP_ADMIN' | 'GROUP_MEMBER' | 'UNAUTHORIZED';

/**
 * Fungsi balasan yang mendukung teks + mention + media.
 */
export interface ReplyOptions {
  mentions?: string[];
  imagePath?: string | null;
  caption?: string;
}

export type ReplyFn = (text: string, options?: ReplyOptions) => Promise<any>;

export interface CommandContext {
  chatJid: string;
  senderJid: string;
  senderNumber: string;
  isGroup: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isBotAdmin: boolean;
  body: string;
  commandName: string;
  args: string[];
  fullArgs: string;
  mentionedJids: string[];
  quotedMsg?: any;
  quotedParticipant?: string; // JID pengirim pesan yang di-reply
  quotedParticipantAlt?: string; // Varian nomor asli (PN) dari pengirim yang di-reply, bila ada
  quotedText?: string; // Teks/caption dari pesan yang di-reply
  msg: any;
  groupName?: string;
}
