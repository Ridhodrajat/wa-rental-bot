import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { ProductRepository } from '../database/repositories/productRepository';
import { ProductRecord } from '../types';

export class CatalogExportImportService {
  /**
   * Export produk ke file Excel (.xlsx)
   */
  static async exportToExcel(groupId: string, outputPath: string): Promise<string> {
    const products = ProductRepository.getByGroupId(groupId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Katalog Produk');

    sheet.columns = [
      { header: 'Nama Produk', key: 'name', width: 30 },
      { header: 'Deskripsi', key: 'description', width: 50 },
    ];

    // Styling header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' },
    };

    for (const p of products) {
      sheet.addRow({
        name: p.original_name,
        description: p.description,
      });
    }

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  /**
   * Export produk ke file Teks (.txt)
   */
  static exportToText(groupId: string, outputPath: string): string {
    const products = ProductRepository.getByGroupId(groupId);
    const lines = products.map((p) => `${p.original_name}|${p.description.replace(/\n/g, '\\n')}`);
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
    return outputPath;
  }

  /**
   * Import produk dari file Teks / Excel
   */
  static async importFromFile(groupId: string, filePath: string, ext: string): Promise<{ added: number; updated: number }> {
    let importedProducts: Array<{ name: string; description: string }> = [];

    if (ext === '.txt' || ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('|');
        if (idx === -1) continue;
        const name = trimmed.slice(0, idx).trim();
        const description = trimmed.slice(idx + 1).trim().replace(/\\n/g, '\n');
        if (name && description) {
          importedProducts.push({ name, description });
        }
      }
    } else if (ext === '.xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const sheet = workbook.worksheets[0];
      if (sheet) {
        sheet.eachRow((row: any, rowNumber: number) => {
          if (rowNumber === 1) return; // skip header
          const name = String(row.getCell(1).value ?? '').trim();
          const description = String(row.getCell(2).value ?? '').trim().replace(/\\n/g, '\n');
          if (name && description) {
            importedProducts.push({ name, description });
          }
        });
      }
    }

    let added = 0;
    let updated = 0;

    for (const item of importedProducts) {
      const existing = ProductRepository.findByName(groupId, item.name);
      if (existing) {
        ProductRepository.updateDescription(groupId, item.name, item.description);
        updated++;
      } else {
        ProductRepository.create(groupId, item.name, item.description);
        added++;
      }
    }

    return { added, updated };
  }
}
