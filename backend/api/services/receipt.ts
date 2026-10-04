import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import type { ReceiptData } from '../../DB/domain';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Espèces',
  cib: 'CIB',
  edahabia: 'Edahabia',
  bank_transfer: 'Virement bancaire',
  card: 'Carte bancaire',
  wallet: 'Portefeuille Wassalni',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
  partially_refunded: 'Partiellement remboursé',
  expired: 'Expiré',
};

const REFUND_STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  succeeded: 'Remboursé',
  failed: 'Échoué',
};

function fmtMoney(amount: string | number, currency: string): string {
  return `${Number(amount).toFixed(2)} ${currency}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-DZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Algiers' });
}

/**
 * Task 9.5 — streams a receipt PDF straight to the HTTP response; nothing is
 * ever written to disk. Deliberately "least detailed": header + one line per
 * payment + one line per refund (if any) + a total — not a full VAT invoice.
 */
export function streamReceiptPdf(res: Response, data: ReceiptData): void {
  const { header, payments, refunds } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="recu-${header.code}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('Wassalni', { continued: false });
  doc.fontSize(10).fillColor('#555').text('Reçu de réservation');
  doc.moveDown(1.5);
  doc.fillColor('#000');

  doc.fontSize(12).text(`Réservation : ${header.code}`);
  doc.text(`Trajet : ${header.trajectory_name} (voyage ${header.trip_code})`);
  doc.text(`Départ : ${fmtDate(header.departure_at)}`);
  doc.text(`Places : ${header.seats}`);
  doc.text(`Client : ${header.customer_name} — ${header.customer_phone}`);
  doc.text(`Réservé le : ${fmtDate(header.created_at)}`);
  doc.moveDown(1);

  doc.fontSize(13).text('Paiements', { underline: true });
  doc.moveDown(0.3);
  if (payments.length === 0) {
    doc.fontSize(11).fillColor('#555').text('Aucun paiement enregistré.');
    doc.fillColor('#000');
  } else {
    for (const p of payments) {
      doc
        .fontSize(11)
        .text(
          `${p.code}  —  ${fmtMoney(p.amount, p.currency)}  —  ${METHOD_LABEL[p.method] ?? p.method}  —  ${
            PAYMENT_STATUS_LABEL[p.status] ?? p.status
          }`,
        );
      doc.fontSize(9).fillColor('#555').text(`  payé le ${fmtDate(p.paid_at)}${Number(p.refunded_amount) > 0 ? `  ·  remboursé : ${fmtMoney(p.refunded_amount, p.currency)}` : ''}`);
      doc.fillColor('#000');
      doc.moveDown(0.2);
    }
  }

  if (refunds.length > 0) {
    doc.moveDown(0.8);
    doc.fontSize(13).text('Remboursements', { underline: true });
    doc.moveDown(0.3);
    for (const r of refunds) {
      doc
        .fontSize(11)
        .text(
          `Paiement ${r.payment_code}  —  ${fmtMoney(r.amount, header.currency)}  —  ${REFUND_STATUS_LABEL[r.status] ?? r.status} (${
            r.initiated_by === 'admin' ? 'admin' : 'système'
          })`,
        );
      doc.fontSize(9).fillColor('#555').text(`  demandé le ${fmtDate(r.created_at)}${r.processed_at ? `, traité le ${fmtDate(r.processed_at)}` : ''}`);
      doc.fillColor('#000');
      doc.moveDown(0.2);
    }
  }

  doc.moveDown(1);
  const totalPaid = payments
    .filter((p) => p.status === 'paid' || p.status === 'partially_refunded' || p.status === 'refunded')
    .reduce((sum, p) => sum + (Number(p.amount) - Number(p.refunded_amount)), 0);
  doc.fontSize(13).text(`Total réservation : ${fmtMoney(header.total_price, header.currency)}`);
  doc.fontSize(13).text(`Net payé (après remboursements) : ${fmtMoney(totalPaid, header.currency)}`);

  doc.moveDown(1.5);
  doc.fontSize(8).fillColor('#999').text('Ce reçu est généré automatiquement et ne constitue pas une facture fiscale.', { align: 'center' });

  doc.end();
}
