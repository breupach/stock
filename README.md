# Stock

App web para gestionar el stock de un taller de torneado: un panel administrativo para cargar productos, precios y movimientos de inventario, y un catálogo público donde los clientes ven la disponibilidad en tiempo real y arman un carrito que termina en una consulta por WhatsApp.

## Stack

- React + Vite en JavaScript, React Router, Tailwind CSS
- Supabase: PostgreSQL, login, tiempo real y fotos
- Vercel para el hosting

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar URL y clave anónima de Supabase
npm run dev
```

### Base de datos

El esquema vive en `supabase/migrations/`. Para aplicarlo a un proyecto de Supabase, pegá cada archivo, en orden, en el SQL Editor del proyecto, o usá la CLI (`supabase db push`).

Después creá el primer administrador (necesita `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`):

```bash
node --env-file=.env.local scripts/crear-admin.js admin "Nombre Apellido" "una-contraseña-segura"
```

## Usuarios

Se ingresa al panel en `/admin/login` con usuario y contraseña. El admin crea usuarios, cambia roles, resetea contraseñas y desactiva cuentas desde **Usuarios**. Esa pantalla habla con la función `/api/users` de Vercel, que usa `SUPABASE_SERVICE_ROLE_KEY`: esa variable va en Vercel **sin** prefijo `VITE_`, para que nunca llegue al navegador. Un usuario desactivado no puede ingresar y pierde la sesión.

## Reglas que garantiza la base

- El stock nunca queda negativo y solo cambia con `registrar_movimiento`, `registrar_conteo` o `revertir_movimiento`.
- Los movimientos no se editan ni se borran; un error se corrige con `revertir_movimiento`.
- El público solo ve `catalogo_publico` y `product_status`: el estado (Disponible, Últimas unidades, Sin stock), nunca la cantidad ni el costo.
- El operador registra movimientos; solo el admin edita productos, precios, marcas, categorías, fotos y configuración.

## Tests

```bash
npm test                                                  # app (Vitest)
npm run test:db -- "postgresql://postgres@localhost:5432/postgres"   # reglas de la base contra un Postgres local
npm run test:e2e                                          # de punta a punta en Chromium, computadora y celular
```

Vercel corre lint, `npm test` y el build en cada deploy y en cada preview de PR; si algo falla, no publica. `test:db` necesita un Postgres, así que se corre localmente antes de cada push.

`test:db` crea una base temporal, aplica las migraciones con un reemplazo mínimo de lo que provee Supabase, prueba permisos y reglas de stock (incluidas dos ventas simultáneas de la última unidad) y la borra al terminar.

`test:e2e` levanta la app y la prueba en un navegador real contra un Supabase falso (`e2e/falsoSupabase.js`), sin red: catálogo y filtros, carrito hasta el link de WhatsApp, login, registrar un movimiento y que el catálogo se actualice en vivo. Necesita Chromium (`npx playwright install chromium` la primera vez). Con `CAPTURAS=1 npm run test:e2e -- capturas` guarda capturas de todas las pantallas en `test-results/capturas/` para revisarlas a ojo.
