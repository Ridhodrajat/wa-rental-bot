import { getSocket, getGroupMetadata, isConnected } from '../connection/whatsapp';
import {
  GroupSettingsRepository,
  TransactionTemplateRepository,
} from '../database/repositories/settingsRepository';
import { getDefaultTemplate } from '../templates/messageTemplates';
import { resolveTemplate } from '../utils/placeholder';
import { formatBusinessDate, formatScheduleTime } from '../utils/time';
import { buildDailyOrderReport, todayBizDate } from './orderReportService';
import logger from '../utils/logger';

/**
 * Layanan buka/tutup grup + penjadwalan otomatis (autoopen / autoclose).
 *
 * Scheduler dijalankan setiap menit. Setiap grup hanya dijalankan sekali per
 * tanggal operasional (dilacak pada kolom autoopen_last / autoclose_last).
 */

async function sendFeatureTemplate(groupId: string, feature: 'open' | 'close'): Promise<void> {
  const sock = getSocket();
  const tx = TransactionTemplateRepository.get(groupId);
  const template =
    (feature === 'open' ? tx?.open_template : tx?.close_template) ??
    getDefaultTemplate(feature);
  const meta = await getGroupMetadata(groupId);
  const { text, mentions } = resolveTemplate(template, {
    groupName: meta?.subject ?? 'Grup',
  });
  await sock.sendMessage(groupId, { text, mentions });
}

/** Buka grup memakai template open. Melempar error bila gagal. */
export async function openGroupWithTemplate(groupId: string): Promise<void> {
  const sock = getSocket();
  await sock.groupSettingUpdate(groupId, 'not_announcement');
  await sendFeatureTemplate(groupId, 'open');
}

/**
 * Tutup grup memakai template close. Melempar error bila gagal.
 * Bila laporan data order aktif, ikut mengirim ringkasan order hari ini.
 */
export async function closeGroupWithTemplate(groupId: string): Promise<void> {
  const sock = getSocket();
  await sock.groupSettingUpdate(groupId, 'announcement');
  await sendFeatureTemplate(groupId, 'close');

  if (GroupSettingsRepository.isDataOrderEnabled(groupId)) {
    try {
      const report = buildDailyOrderReport(groupId, todayBizDate(), 'Laporan Order Hari Ini');
      await sock.sendMessage(groupId, { text: report });
    } catch (error) {
      logger.error({ error, groupId }, 'Gagal mengirim laporan order saat close');
    }
  }
}

export class StoreScheduleService {
  /** Periksa & jalankan jadwal autoopen/autoclose yang jatuh tempo. */
  static async run(): Promise<void> {
    if (!isConnected()) return;

    let groups;
    try {
      groups = GroupSettingsRepository.getScheduleGroups();
    } catch (error) {
      logger.error({ error }, 'Gagal memuat jadwal grup');
      return;
    }
    if (groups.length === 0) return;

    const now = formatScheduleTime();
    const today = formatBusinessDate();

    for (const g of groups) {
      const groupId = g.group_id;
      try {
        if (g.autoopen_enabled === 1 && g.autoopen_time === now && g.autoopen_last !== today) {
          await openGroupWithTemplate(groupId);
          GroupSettingsRepository.markAutoOpenRun(groupId, today);
          logger.info({ groupId }, 'Autoopen dijalankan');
        }

        if (g.autoclose_enabled === 1 && g.autoclose_time === now && g.autoclose_last !== today) {
          await closeGroupWithTemplate(groupId);
          GroupSettingsRepository.markAutoCloseRun(groupId, today);
          logger.info({ groupId }, 'Autoclose dijalankan');
        }
      } catch (error) {
        logger.warn({ error, groupId }, 'Gagal menjalankan jadwal otomatis grup');
      }
    }
  }
}
