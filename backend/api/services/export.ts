import type { Response } from 'express';
import PDFDocument from 'pdfkit';

/**
 * Task 12.3 — generic CSV/PDF export helpers shared by every admin list
 * (drivers, customers, trips, reservations, payments, refunds, payouts,
 * analytics) so each entity only needs to supply its rows + column list
 * once, instead of 16 bespoke renderers.
 */
export interface ExportColumn {
  key: string;
  label: string;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

export function toCsv(rows: Record<string, unknown>[], columns: ExportColumn[]): string {
  const header = columns.map((c) => csvEscape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => csvEscape(cellToString(row[c.key]))).join(',')).join('\n');
  return header + '\n' + body + (rows.length ? '\n' : '');
}

export function sendCsv(res: Response, filename: string, rows: Record<string, unknown>[], columns: ExportColumn[]): void {
  const csv = toCsv(rows, columns);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csv); // BOM so Excel renders UTF-8 accents correctly
}

/** Minimal paginated tabular PDF — adequate for admin export/audit use, not a styled report. */
export function sendPdfTable(res: Response, filename: string, title: string, rows: Record<string, unknown>[], columns: ExportColumn[]): void {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: columns.length > 5 ? 'landscape' : 'portrait' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(8).fillColor('#666').text(`Généré le ${new Date().toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers' })} — ${rows.length} ligne(s)`, { align: 'center' });
  doc.moveDown(1);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = pageWidth / columns.length;

  function drawHeader(): void {
    doc.fontSize(8).fillColor('#000').font('Helvetica-Bold');
    const y = doc.y;
    columns.forEach((c, i) => doc.text(c.label, doc.page.margins.left + i * colWidth, y, { width: colWidth - 4 }));
    doc.moveDown(1);
    doc.font('Helvetica');
  }

  drawHeader();
  for (const row of rows) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let maxLines = 1;
    columns.forEach((c, i) => {
      const text = cellToString(row[c.key]).slice(0, 200);
      doc.fontSize(7).text(text, doc.page.margins.left + i * colWidth, y, { width: colWidth - 4 });
      maxLines = Math.max(maxLines, Math.ceil(doc.heightOfString(text, { width: colWidth - 4 }) / 9));
    });
    doc.y = y + maxLines * 9 + 2;
  }

  doc.end();
}
