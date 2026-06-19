# Authenticated Smoke Test

## Objetivo

Validar de forma corta y no destructiva que el acceso autenticado de cliente y viajero sigue vivo antes de avanzar a smokes operativos.

Este smoke no reemplaza QA de pagos, wallet, matches, envios, viajes, chat, disputas, seguridad ni revision manual del owner.

## Alcance

- Login de cliente temporal.
- Dashboard autenticado de cliente.
- Navegacion segura de cliente por Inicio, Matches, Wallet y Perfil.
- Logout de cliente.
- Login de viajero temporal.
- Dashboard autenticado de viajero.
- Navegacion segura de viajero por Inicio, Matches, Wallet y Perfil.
- Logout de viajero.

## Fuera de alcance

- Admin automatizado. El rol admin sera verificado manualmente por el owner.
- Crear envios.
- Publicar viajes.
- Aceptar, rechazar o cancelar matches.
- Enviar mensajes reales.
- Confirmar entregas.
- Abrir disputas.
- Solicitar retiros.
- Pagos Wompi reales o simulados desde el smoke.
- Webhooks.
- Fixtures con service role.
- Cambios de producto, migraciones o logica sensible.

## Variables requeridas

El smoke exige variables explicitas y no apunta a production por defecto:

- `SMOKE_BASE_URL`
- `SMOKE_CLIENT_EMAIL`
- `SMOKE_CLIENT_PASSWORD`
- `SMOKE_TRAVELER_EMAIL`
- `SMOKE_TRAVELER_PASSWORD`

No escribir valores reales en chat, docs, commits, PRs, issues ni archivos del repo.

## Ejecucion

Ejemplo:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3015 \
SMOKE_CLIENT_EMAIL=cliente-temporal@example.com \
SMOKE_CLIENT_PASSWORD='***' \
SMOKE_TRAVELER_EMAIL=viajero-temporal@example.com \
SMOKE_TRAVELER_PASSWORD='***' \
npm run test:e2e:auth-smoke
```

Si falta `SMOKE_BASE_URL`, la prueba falla antes de abrir navegador con un mensaje claro. Si faltan credenciales, falla de forma controlada indicando el nombre de la variable requerida sin imprimir secretos.

## Seguridad

La configuracion de smoke usa:

- `trace: off`
- `screenshot: off`
- `video: off`

El workflow no sube artifacts. Los tests no imprimen credenciales ni valores de variables de entorno.

## Pendiente operativo

- Definir ambiente autorizado: preview, staging, local o produccion controlada.
- Proveer cuentas temporales de cliente y viajero.
- Ejecutar el smoke completo contra ese ambiente.
- Verificar admin manualmente por el owner.
