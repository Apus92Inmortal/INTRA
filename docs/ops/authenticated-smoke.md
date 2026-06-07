# Authenticated Smoke Test

## Objetivo

Validar de forma corta y no destructiva que los flujos autenticados principales de INTRA siguen vivos en Production antes de avanzar a UI/UX final.

Este smoke no reemplaza pruebas end-to-end completas ni QA de pagos, wallet, disputas o seguridad.

## Alcance v1

- Login de cliente temporal.
- Dashboard de cliente.
- Campana de notificaciones de cliente.
- Crear envío hasta checkout sin pagar.
- Login de viajero temporal.
- Dashboard de viajero.
- Campana de notificaciones de viajero.
- Crear viaje compatible cuando el formulario lo permita.
- Revisar oportunidades compatibles si quedan disponibles.
- Login de admin temporal.
- Carga de `/app/admin`.
- Carga de módulos admin de retiros, verificaciones y disputas/reportes.
- Guard de payout pagado sin referencia solo si existe un payout aprobado de prueba visible.

## Fuera de alcance v1

- Pago real.
- Payment held simulado.
- Release real.
- Payout completo con dinero.
- Disputa completa con pago real.
- Resolución de disputa a favor de cliente o viajero si requiere fixtures de base de datos.
- Paquete sospechoso completo si requiere match/pago armado.
- Fixtures con service role.
- Cambios de producto, UI/UX, migraciones o lógica de dinero.

## Secretos requeridos

Cargar como GitHub Actions secrets del repo:

- `SMOKE_BASE_URL`
- `SMOKE_CLIENT_EMAIL`
- `SMOKE_CLIENT_PASSWORD`
- `SMOKE_TRAVELER_EMAIL`
- `SMOKE_TRAVELER_PASSWORD`
- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

No escribir valores reales en chat, docs, commits, PRs, issues ni archivos del repo.

## Ejecución

1. Crear las cuentas temporales de cliente, viajero y admin.
2. Agregar el admin temporal a `ADMIN_EMAILS` en Vercel Production.
3. Redeployar Production para tomar la allowlist actualizada.
4. Cargar los secrets en GitHub Actions.
5. Ir a GitHub Actions.
6. Ejecutar manualmente `Authenticated Smoke`.
7. Revisar el log PASS/FAIL sin exponer secretos.

## Seguridad

La configuración de smoke usa:

- `trace: off`
- `screenshot: off`
- `video: off`

El workflow no sube artifacts. Los tests no imprimen credenciales ni valores de variables de entorno.

## Limpieza posterior

- Retirar el admin temporal de `ADMIN_EMAILS`.
- Redeployar Production.
- Cambiar o eliminar las contraseñas temporales.
- Eliminar datos de prueba solo si Aldo lo autoriza.
