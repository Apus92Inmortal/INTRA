/**
 * Define la lógica de navegación para las notificaciones del sistema.
 * Mapea tipos de notificación y metadatos a rutas internas de la aplicación.
 */

interface NotificationLike {
  type: string | null;
  related_match_id: string | null;
}

export function getNotificationHref(notification: NotificationLike): string | null {
  const { type, related_match_id } = notification;

  if (!type) return null;

  // 1. Notificaciones vinculadas a un Match (Envíos/Viajes en curso)
  // Prácticamente todos estos tipos requieren related_match_id
  const matchTypes = [
    "new_message",
    "match_requested",
    "match_accepted",
    "match_rejected",
    "match_cancelled",
    "shipment_in_transit",
    "delivery_reported",
    "delivery_confirmed",
    "dispute_opened",
    "dispute_resolved_customer",
    "dispute_resolved_traveler",
    "dispute_closed",
    "payment_released",
    "auto_release_executed",
    "review_reminder",
    "case_reviewing",
    "admin_case_update",
    "shipment_alert",
    "shipment_alert_escalated",
  ];

  if (matchTypes.includes(type) && related_match_id) {
    if (type === "new_message") {
      return `/app/matches/${related_match_id}/chat`;
    }
    return `/app/matches/${related_match_id}`;
  }

  // 2. Notificaciones vinculadas a Wallet (Pagos, Reembolsos, Retiros)
  const walletTypes = [
    "payment_confirmed",
    "payment_failed",
    "payment_cancelled",
    "payment_released",
    "auto_release_executed",
    "refund_manual_required",
    "refund_processed",
    "payout_requested",
    "payout_approved",
    "payout_rejected",
    "payout_paid",
  ];

  if (walletTypes.includes(type)) {
    return "/app/wallet";
  }

  // 3. Notificaciones vinculadas al Perfil (Verificación, Cuentas de Retiro)
  const profileTypes = [
    "verification_approved",
    "verification_rejected",
    "payout_account_approved",
    "payout_account_rejected",
  ];

  if (profileTypes.includes(type)) {
    return "/app/profile";
  }

  // 4. Notificaciones para Administradores
  if (type === "admin_payout_requested") {
    return "/app/admin/payouts";
  }

  if (type === "admin_payout_account_submitted") {
    return "/app/admin/payout-accounts";
  }

  if (type === "admin_user_verification_submitted") {
    return "/app/admin/verifications";
  }

  if (type === "admin_dispute_created") {
    return "/app/admin/disputes";
  }

  if (type === "admin_suspicious_report_created") {
    return "/app/admin/alerts";
  }

  // Fallback para tipos desconocidos o sin match id cuando lo requieren
  return null;
}
