-- Esquema inicial de la app de stock.
--
-- Reglas que este archivo garantiza en la base, no en la app:
--   * El stock nunca es negativo (CHECK) y solo cambia a través de las funciones
--     registrar_movimiento, registrar_conteo y revertir_movimiento.
--   * Los movimientos no se editan ni se borran.
--   * El público solo ve el estado de stock (disponible / ultimas / sin_stock),
--     nunca la cantidad ni el costo.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.unidad_medida as enum ('unidad', 'metro', 'kg');
create type public.rol_usuario as enum ('admin', 'operador');
create type public.tipo_movimiento as enum (
  'stock_inicial', 'entrada', 'salida', 'devolucion', 'ajuste', 'merma'
);
create type public.estado_stock as enum ('disponible', 'ultimas', 'sin_stock');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  name       text not null check (length(trim(name)) > 0),
  role       public.rol_usuario not null default 'operador',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.brands (
  id         bigint generated always as identity primary key,
  name       text not null unique check (length(trim(name)) > 0),
  sort_order integer not null default 0
);

create table public.categories (
  id         bigint generated always as identity primary key,
  name       text not null unique check (length(trim(name)) > 0),
  sort_order integer not null default 0
);

create table public.products (
  id          bigint generated always as identity primary key,
  sku         text not null unique check (length(trim(sku)) > 0),
  name        text not null check (length(trim(name)) > 0),
  brand_id    bigint references public.brands (id),
  model       text,
  year        integer check (year between 1900 and 2100),
  category_id bigint references public.categories (id),
  description text,
  unit        public.unidad_medida not null default 'unidad',
  cost        numeric(14, 2) check (cost >= 0),
  price       numeric(14, 2) not null check (price >= 0),
  stock       numeric(12, 3) not null default 0 check (stock >= 0),
  min_stock   numeric(12, 3) not null default 0 check (min_stock >= 0),
  active      boolean not null default true,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index products_brand_idx on public.products (brand_id);
create index products_category_idx on public.products (category_id);

create table public.product_photos (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index product_photos_product_idx on public.product_photos (product_id, sort_order);

create table public.stock_movements (
  id            bigint generated always as identity primary key,
  product_id    bigint not null references public.products (id),
  type          public.tipo_movimiento not null,
  quantity      numeric(12, 3) not null check (quantity <> 0),
  reason        text,
  reference     text,
  user_id       uuid not null references auth.users (id),
  created_at    timestamptz not null default now(),
  balance_after numeric(12, 3) not null check (balance_after >= 0),
  reverses_id   bigint unique references public.stock_movements (id)
);

create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_created_idx on public.stock_movements (created_at desc);

create table public.price_changes (
  id         bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  old_price  numeric(14, 2) not null,
  new_price  numeric(14, 2) not null,
  user_id    uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index price_changes_product_idx on public.price_changes (product_id, created_at desc);

create table public.product_status (
  product_id bigint primary key references public.products (id) on delete cascade,
  status     public.estado_stock not null,
  updated_at timestamptz not null default now()
);

create table public.settings (
  key   text primary key,
  value text not null default ''
);

insert into public.settings (key, value) values
  ('whatsapp_numero', ''),
  ('nombre_negocio', '');

-- ---------------------------------------------------------------------------
-- Roles del usuario actual
-- ---------------------------------------------------------------------------

create function public.rol_actual()
returns public.rol_usuario
language sql stable security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.es_personal()
returns boolean
language sql stable
set search_path = ''
as $$ select public.rol_actual() is not null $$;

create function public.es_admin()
returns boolean
language sql stable
set search_path = ''
as $$ select coalesce(public.rol_actual() = 'admin', false) $$;

-- ---------------------------------------------------------------------------
-- Estado público y triggers
-- ---------------------------------------------------------------------------

create function public.calcular_estado(p_stock numeric, p_min_stock numeric)
returns public.estado_stock
language sql immutable
set search_path = ''
as $$
  select case
    when p_stock <= 0 then 'sin_stock'
    when p_stock <= p_min_stock then 'ultimas'
    else 'disponible'
  end::public.estado_stock
$$;

create function public.sincronizar_estado()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.product_status as ps (product_id, status, updated_at)
  values (new.id, public.calcular_estado(new.stock, new.min_stock), now())
  on conflict (product_id) do update
    set status = excluded.status, updated_at = now()
    where ps.status is distinct from excluded.status;
  return null;
end;
$$;

create trigger products_sincronizar_estado
after insert or update of stock, min_stock on public.products
for each row execute function public.sincronizar_estado();

create function public.registrar_cambio_precio()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.price_changes (product_id, old_price, new_price, user_id)
  values (new.id, old.price, new.price, auth.uid());
  return null;
end;
$$;

create trigger products_registrar_cambio_precio
after update of price on public.products
for each row when (old.price is distinct from new.price)
execute function public.registrar_cambio_precio();

create function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_tocar_updated_at
before update on public.products
for each row execute function public.tocar_updated_at();

create function public.limitar_fotos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.product_photos where product_id = new.product_id) >= 5 then
    raise exception 'maximo_fotos' using hint = 'Un producto admite hasta 5 fotos.';
  end if;
  return new;
end;
$$;

create trigger product_photos_limitar
before insert on public.product_photos
for each row execute function public.limitar_fotos();

-- ---------------------------------------------------------------------------
-- Movimientos de stock
-- ---------------------------------------------------------------------------

-- Núcleo interno: aplica un delta con signo y registra el movimiento en una sola
-- sentencia condicionada. Si dos usuarios cargan a la vez, el UPDATE toma el
-- lock de la fila y el segundo ve el saldo ya actualizado.
create function public._aplicar_movimiento(
  p_product_id  bigint,
  p_type        public.tipo_movimiento,
  p_delta       numeric,
  p_reason      text,
  p_reference   text,
  p_reverses_id bigint
)
returns public.stock_movements
language plpgsql security definer
set search_path = ''
as $$
declare
  v_product  public.products;
  v_saldo    numeric;
  v_mov      public.stock_movements;
begin
  if p_delta is null or p_delta = 0 then
    raise exception 'cantidad_invalida' using hint = 'La cantidad no puede ser cero.';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception 'producto_inexistente';
  end if;
  if not v_product.active then
    raise exception 'producto_inactivo';
  end if;
  if v_product.unit = 'unidad' and p_delta <> trunc(p_delta) then
    raise exception 'cantidad_entera' using hint = 'Este producto se cuenta por unidades enteras.';
  end if;

  update public.products
     set stock = stock + p_delta
   where id = p_product_id
     and stock + p_delta >= 0
  returning stock into v_saldo;

  if not found then
    raise exception 'stock_insuficiente'
      using hint = format('Stock actual: %s', (select stock from public.products where id = p_product_id));
  end if;

  insert into public.stock_movements
    (product_id, type, quantity, reason, reference, user_id, balance_after, reverses_id)
  values
    (p_product_id, p_type, p_delta, nullif(trim(p_reason), ''), nullif(trim(p_reference), ''),
     auth.uid(), v_saldo, p_reverses_id)
  returning * into v_mov;

  return v_mov;
end;
$$;

create function public.registrar_movimiento(
  p_product_id bigint,
  p_type       public.tipo_movimiento,
  p_quantity   numeric,
  p_reason     text default null,
  p_reference  text default null
)
returns public.stock_movements
language plpgsql security definer
set search_path = ''
as $$
declare
  v_rol   public.rol_usuario := public.rol_actual();
  v_delta numeric;
begin
  if v_rol is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  if p_type = 'stock_inicial' and v_rol <> 'admin' then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  if p_type in ('devolucion', 'ajuste', 'merma') and coalesce(trim(p_reason), '') = '' then
    raise exception 'motivo_obligatorio';
  end if;

  if p_type = 'ajuste' then
    v_delta := p_quantity;
  elsif p_quantity is null or p_quantity <= 0 then
    raise exception 'cantidad_invalida' using hint = 'La cantidad debe ser mayor a cero.';
  elsif p_type in ('salida', 'merma') then
    v_delta := -p_quantity;
  else
    v_delta := p_quantity;
  end if;

  return public._aplicar_movimiento(p_product_id, p_type, v_delta, p_reason, p_reference, null);
end;
$$;

-- Conteo físico: se informa lo contado y se registra un ajuste por la diferencia.
-- Devuelve null si lo contado coincide con el saldo.
create function public.registrar_conteo(
  p_product_id bigint,
  p_contado    numeric,
  p_reason     text default 'Conteo físico'
)
returns public.stock_movements
language plpgsql security definer
set search_path = ''
as $$
declare
  v_stock numeric;
begin
  if public.rol_actual() is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  if p_contado is null or p_contado < 0 then
    raise exception 'cantidad_invalida' using hint = 'Lo contado no puede ser negativo.';
  end if;

  select stock into v_stock from public.products where id = p_product_id for update;
  if not found then
    raise exception 'producto_inexistente';
  end if;
  if p_contado = v_stock then
    return null;
  end if;

  return public._aplicar_movimiento(
    p_product_id, 'ajuste', p_contado - v_stock,
    coalesce(nullif(trim(p_reason), ''), 'Conteo físico'), null, null
  );
end;
$$;

-- Corrección de un error: registra el movimiento inverso. Cada movimiento se
-- puede revertir una sola vez (reverses_id es único).
create function public.revertir_movimiento(p_movement_id bigint, p_reason text)
returns public.stock_movements
language plpgsql security definer
set search_path = ''
as $$
declare
  v_orig public.stock_movements;
begin
  if public.rol_actual() is null then
    raise exception 'no_autorizado' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'motivo_obligatorio';
  end if;

  select * into v_orig from public.stock_movements where id = p_movement_id;
  if not found then
    raise exception 'movimiento_inexistente';
  end if;
  if v_orig.reverses_id is not null then
    raise exception 'movimiento_es_reversion';
  end if;
  if exists (select 1 from public.stock_movements where reverses_id = p_movement_id) then
    raise exception 'movimiento_ya_revertido';
  end if;

  return public._aplicar_movimiento(
    v_orig.product_id, 'ajuste', -v_orig.quantity, p_reason, null, p_movement_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Catálogo público: solo columnas aptas para clientes. La vista corre con los
-- permisos de su dueño, por eso puede leer products sin exponer stock ni costo.
-- ---------------------------------------------------------------------------

create view public.catalogo_publico as
select
  p.id,
  p.sku,
  p.name,
  p.brand_id,
  b.name as brand_name,
  p.model,
  p.year,
  p.category_id,
  c.name as category_name,
  p.description,
  p.unit,
  p.price,
  coalesce(ps.status, public.calcular_estado(p.stock, p.min_stock)) as status
from public.products p
left join public.brands b on b.id = p.brand_id
left join public.categories c on c.id = p.category_id
left join public.product_status ps on ps.product_id = p.id
where p.active and p.visible;

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.brands          enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_photos  enable row level security;
alter table public.stock_movements enable row level security;
alter table public.price_changes   enable row level security;
alter table public.product_status  enable row level security;
alter table public.settings        enable row level security;

-- profiles: el personal ve a todos (para mostrar quién hizo cada movimiento).
-- Altas, bajas y cambios de rol pasan por /api/users con la clave de servicio.
create policy profiles_select on public.profiles
  for select to authenticated using (public.es_personal());

-- Marcas, categorías y configuración: lectura pública, escritura solo admin.
create policy brands_select on public.brands for select to anon, authenticated using (true);
create policy brands_write on public.brands for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy settings_select on public.settings for select to anon, authenticated using (true);
create policy settings_write on public.settings for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- products: solo el personal. El admin puede escribir, pero nunca la columna stock
-- (ver grants por columna más abajo).
create policy products_select on public.products
  for select to authenticated using (public.es_personal());
create policy products_insert on public.products
  for insert to authenticated with check (public.es_admin());
create policy products_update on public.products
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Fotos: públicas las de productos visibles; escritura solo admin.
create policy product_photos_select on public.product_photos
  for select to anon, authenticated
  using (
    public.es_personal()
    or exists (
      select 1 from public.products p
      where p.id = product_id and p.active and p.visible
    )
  );
create policy product_photos_write on public.product_photos for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Movimientos e historial de precios: lectura del personal; nadie escribe directo.
create policy stock_movements_select on public.stock_movements
  for select to authenticated using (public.es_personal());
create policy price_changes_select on public.price_changes
  for select to authenticated using (public.es_personal());

-- Estado público: lo lee cualquiera (es lo que escucha el catálogo en tiempo real).
create policy product_status_select on public.product_status
  for select to anon, authenticated using (true);

-- Grants. RLS decide qué filas; los grants deciden qué tablas y columnas.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.catalogo_publico, public.brands, public.categories,
  public.product_photos, public.product_status, public.settings to anon, authenticated;
grant select on public.profiles, public.products, public.stock_movements,
  public.price_changes to authenticated;

grant insert, update, delete on public.brands, public.categories, public.product_photos
  to authenticated;
grant update (value) on public.settings to authenticated;

-- products: todas las columnas editables menos stock, id y fechas.
grant insert (sku, name, brand_id, model, year, category_id, description, unit,
  cost, price, min_stock, active, visible) on public.products to authenticated;
grant update (sku, name, brand_id, model, year, category_id, description, unit,
  cost, price, min_stock, active, visible) on public.products to authenticated;

-- Funciones: el núcleo interno no lo llama nadie de afuera.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.rol_actual(), public.es_personal(), public.es_admin(),
  public.calcular_estado(numeric, numeric) to anon, authenticated;
grant execute on function
  public.registrar_movimiento(bigint, public.tipo_movimiento, numeric, text, text),
  public.registrar_conteo(bigint, numeric, text),
  public.revertir_movimiento(bigint, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Tiempo real y fotos (solo existen en Supabase; se omiten en un Postgres común)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.product_status, public.products;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('fotos', 'fotos', true)
    on conflict (id) do nothing;

    create policy fotos_admin_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'fotos' and public.es_admin());
    create policy fotos_admin_update on storage.objects
      for update to authenticated
      using (bucket_id = 'fotos' and public.es_admin());
    create policy fotos_admin_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'fotos' and public.es_admin());
  end if;
end;
$$;
