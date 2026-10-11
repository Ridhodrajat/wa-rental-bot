import { CatalogTemplate, getCatalogTemplate } from '../templates/catalogTemplates';
import { resolveTemplate, displayNameFromJid } from './placeholder';
import { ProductRecord } from '../types';
import { getDatabase } from '../database/db';

/**
 * Renderer katalog produk menggunakan template aesthetic.
 * Menggabungkan header + daftar produk + footer dengan placeholder yang sesuai.
 */

export interface CatalogRenderResult {
  text: string;
  mentions: string[];
}

/**
 * Ambil konfigurasi template katalog grup dari DB.
 */
export function getGroupCatalogConfig(groupId: string): {
  templateId: number;
  header: string | null;
  footer: string | null;
} {
  const db = getDatabase();
  const row = db
    .prepare(
      'SELECT catalog_template_id, catalog_header, catalog_footer FROM group_settings WHERE group_id = ?'
    )
    .get(groupId) as unknown as
    | { catalog_template_id: number; catalog_header: string | null; catalog_footer: string | null }
    | undefined;

  return {
    templateId: row?.catalog_template_id ?? 1,
    header: row?.catalog_header ?? null,
    footer: row?.catalog_footer ?? null,
  };
}

/**
 * Render katalog produk untuk sebuah grup.
 */
export function renderCatalog(params: {
  groupId: string;
  groupName: string;
  requesterJid: string;
  requesterName?: string;
  products: ProductRecord[];
  templateId?: number;
  customHeader?: string | null;
  customFooter?: string | null;
}): CatalogRenderResult {
  const config = getGroupCatalogConfig(params.groupId);
  const templateId = params.templateId ?? config.templateId;
  const template: CatalogTemplate = getCatalogTemplate(templateId);

  const requesterName = params.requesterName || displayNameFromJid(params.requesterJid);

  // Header: manual jika ada, jika tidak pakai template
  const headerRaw = params.customHeader ?? config.header ?? template.header;
  const footerRaw = params.customFooter ?? config.footer ?? template.footer;

  // Pre-replace placeholder khusus katalog
  const prep = (raw: string): string =>
    raw.replace(/@namawaorangyangmengetiklist/g, requesterName);

  const headerResolved = resolveTemplate(prep(headerRaw), {
    user: requesterName,
    userJid: params.requesterJid,
    groupName: params.groupName,
  });

  const footerResolved = resolveTemplate(prep(footerRaw), {
    user: requesterName,
    userJid: params.requesterJid,
    groupName: params.groupName,
  });

  // Daftar produk
  let productBlock = '';
  if (params.products.length === 0) {
    productBlock = `${template.productPrefix}(belum ada produk)`;
  } else {
    productBlock = params.products
      .map((p) => `${template.productPrefix}${p.original_name}`)
      .join('\n');
  }

  const text = [headerResolved.text, productBlock, footerResolved.text]
    .filter((s) => s && s.trim().length > 0)
    .join('\n');

  // Gabungkan mention (hindari duplikat)
  const mentions = Array.from(new Set([...headerResolved.mentions, ...footerResolved.mentions]));

  return { text, mentions };
}
