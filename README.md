# INTRA

[![CI](https://github.com/Apus92Inmortal/INTRA/actions/workflows/ci.yml/badge.svg)](https://github.com/Apus92Inmortal/INTRA/actions/workflows/ci.yml)

## Manual UI/UX vigente

El manual oficial y vigente de UI/UX para INTRA es:

`docs/ui-ux/Manual_UIUX_INTRA_v3_0_Oficial.pdf`

Este documento es la fuente unica de verdad para decisiones visuales, componentes, tokens, navegacion, Core Mobile, Core PC, CTAs, cards, inputs, badges, iconografia, tablas, ventanas emergentes, estados de carga, errores, mensajes, microcopy y QA visual.

El Manual UI/UX INTRA v2.2 y los manuales anteriores quedan derogados.

Antes de implementar cualquier cambio UI/UX, se debe revisar si el cambio cumple el Manual UI/UX INTRA v3.0. Si una pantalla o componente contradice el manual, se debe reportar la contradiccion, explicar la regla afectada y proponer correccion o excepcion antes de implementar.

Regla clave: el manual manda, pero puede evolucionar. Lo que no se permite es improvisar.

INTRA usa Next.js App Router, React, TypeScript, Supabase y checkout Wompi. Antes de modificar el proyecto, leer `AGENTS.md` y `docs/agent/START_HERE.md`.

## Desarrollo local

Usar Node.js **24.x** y npm **11.x**, como define `package.json`. CI tambien usa Node 24. El lockfile es la fuente de las versiones instaladas; Next.js y `eslint-config-next` deben mantener la misma version.

```bash
node --version
npm --version
npm ci
```

`npm ci` instala exactamente `package-lock.json` y reemplaza `node_modules`. Usarlo despues de cambiar de rama o actualizar el lockfile; una instalacion anterior no valida las versiones del repo. Las actualizaciones intencionales deben incluir `package.json` y el lockfile revisado.

Para navegar las paginas publicas, la app permite arrancar sin variables de Supabase; no permite iniciar sesion ni operar datos en ese modo.

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

`npm run dev` y `npm run build` usan la bandera oficial `--webpack` de Next.js 16.3.8 en PC, CI y Vercel. En la verificacion local, Turbopack fallo al descargar Inter desde Google Fonts y resolver su modulo virtual; con Webpack pasaron los ocho E2E publicos. Esta eleccion de compilador conserva `next/font/google`, Inter, Geist Mono y los tokens visuales del manual; no cambia la UI ni sustituye las fuentes. Revalidar arranque, build y E2E antes de volver a Turbopack.

Para probar flujos autenticados, crear `.env.local` a partir de `.env.example` y usar **un proyecto Supabase aislado de desarrollo**, cuentas de prueba y Wompi sandbox. Reemplazar todos los placeholders, incluida la URL de Supabase, antes de arrancar. No reutilizar URL/credencial administrativa de Production en Development o Preview.

`SUPABASE_SERVICE_ROLE_KEY`, las claves `INTRA_WOMPI_*`, la allowlist admin y los secretos de cron son solo de servidor. Configurarlos unicamente si el flujo local los necesita y con valores del entorno aislado. No subir `.env.local`, copiar secretos de Production al repo ni ejecutar pruebas con dinero real por defecto.

## Testing

Install the browser used for end to end tests:

```bash
npm run playwright:install
```

Run unit tests with Vitest:

```bash
npm run test:unit
```

Typecheck the project:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

Run end to end tests with Playwright:

```bash
npm run test:e2e
```

Las regresiones de base de datos usan PostgreSQL 17 desechable en loopback y datos sinteticos. Definir `INTRA_TEST_PG_PORT`, `INTRA_TEST_PG_USER`, `INTRA_TEST_PG_PASSWORD` e `INTRA_TEST_PG_SNAPSHOT=supabase/tests/fixtures/pre-corrections-schema-20261013.json` antes de ejecutar:

```bash
npm run test:db
```

El usuario local de pruebas necesita crear bases temporales. Las suites rechazan hosts remotos, no leen `.env.local` y eliminan sus bases al terminar. El snapshot contiene esquema, sin registros de usuarios ni secretos.

## CI

GitHub Actions valida pull requests y pushes a `main` o ramas de trabajo configuradas, incluida `codex/**`, con `npm ci` y Node 24:

- audit de dependencias de produccion (bloquea severidad alta o critica)
- lint
- unit tests
- typecheck
- build
- ocho E2E publicos de `tests/e2e/home.spec.ts` y `tests/e2e/launch-security.spec.ts`, con Chromium y servidor local
- regresiones SQL de A03/A04/A06 en un job `database` separado, con PostgreSQL 17 local y snapshot de esquema

El CI normal no recibe secretos ni credenciales Supabase/Wompi. Los casos financieros usan datos sinteticos y PostgreSQL local; no crean usuarios o envios remotos ni mueven dinero real. El workflow manual `Authenticated Smoke` es independiente: requiere cuentas temporales de un entorno aislado y revision de su alcance antes de ejecutarlo. Un PASS local no certifica el funcionamiento del entorno de produccion.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
