# INTRA - Current Session

## Estado vigente - 2026-10-13

Objetivo autorizado: corregir la auditoria A01-A15 y preparar un piloto
controlado con usuarios conocidos. Rama `codex/launch-corrections`, desde
`main` `5574036` (PR #182). Las correcciones nuevas no estan en Production.
El cierre previo A01/A02 si esta publicado; permisos remotos A02 14/14 PASS.

## Cambios preparados

- Cinco migraciones `20261013*`: refunds/revision/cancelacion atomicos A03,
  privacidad contextual y permisos A06, ingesta/retry Wompi A04, guards de
  actores internos A01 y limites privados de Storage A13.
- Acciones Dashboard/admin, webhook, retorno de checkout y endpoint admin
  de conciliacion consumen las RPC revisadas. Credito unico e idempotencia,
  rollback de fallos tardios, eventos no procesados ante errores y cotejo
  canonico del proveedor. No crean un cobro ni una devolucion externa.
- Admin exclusivamente por UUID; browser/SSR/proxy/service client bloquean
  Production en hosted nonprod. Wompi nonprod exige sandbox/claves test.
- Dependencias/lock, Node24, CI con PostgreSQL17/audit/E2E, headers,
  uploads, foco/teclado/portals/confirmaciones y robots/sitemap corregidos.
  Manual UI/UX v3.0 revisado; Next genero su bloque de instrucciones AGENTS.
- Informes, pre/postflight, fixture de DDL sin filas, gates externos y
  secuencia de rollout preparados. Evidencias B-H ya integradas: se aclaro
  el historial documental sin tratarlas como funcionalidades ausentes.

Archivos: `supabase/migrations/20261013*`, `supabase/tests/`, acciones/rutas
financieras, `lib/auth`, `lib/supabase`, `lib/wompi.ts`, `proxy.ts`,
`next.config.ts`, componentes de modales, workflows, package/lock,
tests y memoria. El diff de la rama es la lista exacta.

## Validacion local

- Lint PASS: una advertencia en redireccion de password existente
  (`window.location.assign`); no error. Se conserva la recarga tras signOut.
- Unit PASS: 114 pruebas / 24 archivos; TypeScript PASS; build webpack PASS.
- Audit dependencias Production: 0 vulnerabilidades. Audit completo mantiene
  5 high derivados de un advisory sin parche de braces en herramientas dev;
  no se forzo downgrade de Next.
- `npm run test:db` PASS sobre PostgreSQL17 loopback: A03 18 checks, A04 15,
  A06 roles/privacidad/concurrencia/guards, 16 postflight y grants A01/A02.
  Las cinco migraciones se aplican al DDL remoto exacto en bases desechables.
- E2E publico/seguridad: 8/8 PASS tras normalizar URL vacia en Windows;
  navegacion, legal, overflow mobile, headers, indexing y teclado de modal.
- No se probo Auth/Storage HTTP real, restore de datos/objetos ni ciclo de
  dinero. Los fixtures son sinteticos; no se copiaron filas Production.

## Riesgos y pendientes

- Publicar solo con preflight, CI del SHA y aprobacion final explicita.
  No ejecutar `supabase db push` sobre el historial antiguo desalineado.
- Cuenta admin seleccionada por el titular localizada (una coincidencia,
  confirmada/no bloqueada); email/UUID privados. Falta ADMIN_USER_IDS efectivo
  y prueba de acceso. Env metadata API Vercel 403; CLI sin sesion propia.
  Fallback navegador autentico confirma Hobby y scopes compartidos
  Production/Preview, incluido service-role; ajuste aun no aplicado.
- Aislar credenciales/overrides/deployments antiguos, verificar plan Vercel,
  SMTP/confirm/reset, MFA con enforcement y proteccion de password; revisar DNS.
- A05/TASK-047: titular no recuerda referencia. Seis payments pendientes
  antiguos requieren consulta del proveedor; no asumir cobro ni crear otro.
- `shipment_cancelled_before_approval` permanece pendiente: operador debe
  conciliar y resolver devolucion externa con registro sin duplicar Wallet.
- Restore DB+Storage aislado, alertas recibidas, QA autenticado mobile/PC,
  aforo/limites/soporte y validacion legal/contable aun son gates del piloto.

## Siguiente paso y lecturas

Cerrar PR; verificar `validate`, `database`, `detect-impact` del HEAD;
aplicar/verificar proteccion de main. Resolver acceso/env admin y gates
externos antes de solicitar/publicar la ventana Production. No abrir cobros.

Leer AGENTS/START_HERE, esta memoria, TASKS/DB_NOTES/DECISIONS/KNOWN_ISSUES,
[matriz A01-A15](../audits/2026-10-13-launch-corrections-status.md),
[revision financiera](../audits/2026-10-13-financial-corrections-review.md),
[gates externos](../ops/launch-external-gates-20261013.md) y
[rollout](../ops/launch-corrections-rollout-20261013.md).
El historial de sesiones anteriores se conserva en Git y las otras memorias.
