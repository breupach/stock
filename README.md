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

## Reglas que garantiza la base

- El stock nunca queda negativo y solo cambia con `registrar_movimiento`, `registrar_conteo` o `revertir_movimiento`.
- Los movimientos no se editan ni se borran; un error se corrige con `revertir_movimiento`.
- El público solo ve `catalogo_publico` y `product_status`: el estado (Disponible, Últimas unidades, Sin stock), nunca la cantidad ni el costo.
- El operador registra movimientos; solo el admin edita productos, precios, marcas, categorías, fotos y configuración.

## Tests

```bash
npm test                                                  # app (Vitest)
npm run test:db -- "postgresql://postgres@localhost:5432/postgres"   # reglas de la base contra un Postgres local
```

`test:db` crea una base temporal, aplica las migraciones con un reemplazo mínimo de lo que provee Supabase, prueba permisos y reglas de stock (incluidas dos ventas simultáneas de la última unidad) y la borra al terminar.
