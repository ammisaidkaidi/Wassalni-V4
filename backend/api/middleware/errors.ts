import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { DomainValidationError, explainDomainError } from '../../DB/domain';

/** HTTP error with a machine-readable code — thrown anywhere, mapped by errorHandler. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

/**
 * User-facing French translations of the DZxxx domain error catalogue
 * (Task 1.5) — DOMAIN_ERRORS in domain.ts stays the technical/English
 * reference shown on the admin "Codes erreurs" screen; this is what
 * customers/drivers actually see in an alert when one of those errors
 * reaches them. Codes not listed here fall back to the technical message
 * rather than show nothing.
 */
const USER_MESSAGES: Readonly<Record<string, string>> = {
  DZ001: 'Cette action n\u2019est pas autorisée.',
  DZ101: 'Le nom de la trajectoire ne peut pas être vide.',
  DZ102: 'Trajectoire introuvable.',
  DZ103: 'Le nom d\u2019une trajectoire ne peut pas être modifié après sa création.',
  DZ201: 'Wilaya inconnue.',
  DZ202: 'Cette daïra n\u2019appartient pas à la wilaya sélectionnée.',
  DZ203: 'Cette commune n\u2019appartient pas à la wilaya sélectionnée.',
  DZ204: 'Impossible de fusionner des WPoints de wilayas différentes.',
  DZ205: 'WPoint introuvable.',
  DZ206: 'La wilaya ou la trajectoire d\u2019un WPoint ne peuvent pas être modifiées une fois créées — créez un nouveau WPoint si nécessaire.',
  DZ301: 'Voyage introuvable.',
  DZ302: 'Ce voyage n\u2019est pas réservable pour le moment (non planifié, non publié, ou déjà parti).',
  DZ303: 'Plus assez de places disponibles sur ce trajet.',
  DZ304: 'Ce changement de statut n\u2019est pas autorisé pour ce voyage dans son état actuel.',
  DZ305: 'La nouvelle capacité est inférieure au nombre de places déjà réservées.',
  DZ306: 'Ce voyage est publié et a des réservations actives — ses informations principales ne peuvent plus être modifiées.',
  DZ307: 'Les arrêts et tarifs de ce voyage sont verrouillés car il a des réservations actives.',
  DZ308: 'Aucun tarif n\u2019est défini pour ce trajet (point de prise en charge / dépose).',
  DZ401: 'Réservation introuvable.',
  DZ402: 'Cette réservation ne peut pas être modifiée ou annulée dans son état actuel.',
  DZ403: 'Une réservation annulée ne peut pas être payée.',
  DZ404: 'Client introuvable.',
  DZ501: 'Paiement introuvable.',
  DZ502: 'Ce paiement ne peut pas être remboursé ou modifié dans son état actuel.',
  DZ503: 'Le montant dépasserait le total dû pour cette réservation.',
  DZ504: 'La devise ne correspond pas à celle de la réservation.',
  DZ505: 'Montant de remboursement invalide (doit être positif et ne pas dépasser le solde remboursable).',
  DZ601: 'Ce point n\u2019est pas un arrêt valide pour ce voyage.',
  DZ602: 'Ce WPoint est utilisé par des réservations et ne peut pas être supprimé.',
  DZ603: 'Le point de prise en charge doit précéder le point de dépose sur l\u2019itinéraire.',
  DZ604: 'Cette commune n\u2019est pas desservie par cet arrêt — choisissez une autre commune.',
  DZ605: 'Ces coordonnées GPS semblent se situer en dehors de l\u2019Algérie.',
  DZ309: 'L\u2019absence du conducteur ne peut être signalée que sur un voyage qui n\u2019a pas encore démarré.',
  DZ701: 'Document KYC introuvable.',
  DZ702: 'Ce document a déjà été examiné (approuvé ou refusé).',
  DZ703: 'Un motif de refus est requis.',
  DZ711: 'Fiche de contrôle technique introuvable.',
  DZ712: 'Cette fiche de contrôle technique a déjà été examinée.',
  DZ713: 'Un motif de refus est requis.',
  DZ714: 'Ce véhicule n’a pas de contrôle technique approuvé et valide (ou est signalé hors service) — le voyage ne peut pas être publié.',
  DZ721: 'Seule une réservation terminée peut être notée.',
  DZ722: 'Cette note a déjà été soumise.',
  DZ723: 'Vous ne pouvez noter que vos propres réservations.',
  DZ731: 'Transaction de paiement introuvable.',
  DZ732: 'La signature du webhook de paiement est invalide.',
  DZ733: 'Ce paiement a déjà été traité.',
};

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wrap async route handlers so rejections reach the error middleware. */
export const wrap =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof DomainValidationError) {
    res.status(400).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join(' ; '),
      },
    });
    return;
  }
  const domain = explainDomainError(err);
  if (domain) {
    // SQLSTATE DZxxx raised by the delivery-domain functions/triggers — show
    // the friendly French translation to the user, keep the technical
    // English description available alongside it for support/debugging.
    res.status(400).json({
      error: {
        code: domain.sqlstate,
        message: USER_MESSAGES[domain.sqlstate] ?? domain.message,
        description: domain.description,
      },
    });
    return;
  }
  // PostgreSQL SQLSTATE: a property in direct mode, embedded in the message in
  // Management API mode ("Failed to run sql query: ERROR:  23505: …")
  const pgCode =
    (err as { code?: string })?.code ??
    /ERROR:\s+(\d{5}):/.exec(err instanceof Error ? err.message : String(err))?.[1];
  if (pgCode === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Cette valeur existe déjà' } });
    return;
  }
  if (pgCode === '23503') {
    res.status(409).json({ error: { code: 'IN_USE', message: 'Cette entrée est référencée ailleurs — suppression impossible' } });
    return;
  }
  console.error('✗ unhandled error:', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erreur interne du serveur' } });
}

