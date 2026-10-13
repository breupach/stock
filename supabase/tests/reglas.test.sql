-- Pruebas de las reglas de stock y permisos. Corre con supabase/tests/run.sh.
\set ON_ERROR_STOP 1
\o /dev/null

create function pg_temp.espera_error(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FALLO: se esperaba el error "%" en: %', p_msg, p_sql;
exception when others then
  if sqlerrm not like '%' || p_msg || '%' then
    raise exception 'FALLO: se esperaba "%" y llegó "%" en: %', p_msg, sqlerrm, p_sql;
  end if;
end $$;

create function pg_temp.igual(p_real anyelement, p_esperado anyelement, p_que text) returns void language plpgsql as $$
begin
  if p_real is distinct from p_esperado then
    raise exception 'FALLO: % = %, se esperaba %', p_que, p_real, p_esperado;
  end if;
end $$;

-- Usuarios de prueba
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, username, name, role, active) values
  ('00000000-0000-0000-0000-00000000000a', 'admin', 'Admin', 'admin', true),
  ('00000000-0000-0000-0000-00000000000b', 'operador', 'Operador', 'operador', true),
  ('00000000-0000-0000-0000-00000000000c', 'baja', 'Dado de baja', 'admin', false);

-- Admin sin el código de seguridad: solo ve su propio perfil
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.igual((select role::text from public.profiles where id = auth.uid()), 'admin', 'admin sin código ve su perfil');
select pg_temp.igual((select count(*) from public.profiles), 1::bigint, 'admin sin código no ve a los demás');
select pg_temp.espera_error($$insert into public.brands (name) values ('SinCodigo')$$, 'row-level security');
select pg_temp.espera_error($$select public.registrar_movimiento(1, 'entrada', 1)$$, 'no_autorizado');

-- Admin con el código: alta de producto y stock inicial
set request.jwt.claim.aal = 'aal2';
insert into public.brands (name) values ('Acme');
insert into public.products (sku, name, brand_id, price, cost, min_stock)
  values ('BUJ-001', 'Buje de bronce', (select id from public.brands where name = 'Acme'), 1500, 900, 2);
insert into public.products (sku, name, price, unit) values ('BAR-001', 'Barra de acero', 800, 'metro');
select pg_temp.igual((select status::text from public.product_status ps join public.products p on p.id = ps.product_id where p.sku = 'BUJ-001'), 'sin_stock', 'estado inicial');
select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'stock_inicial', 10);
select pg_temp.igual((select stock from public.products where sku = 'BUJ-001'), 10.000, 'stock tras stock inicial');
select pg_temp.igual((select status::text from public.product_status ps join public.products p on p.id = ps.product_id where p.sku = 'BUJ-001'), 'disponible', 'estado con stock');
select pg_temp.espera_error($$update public.products set stock = 99 where sku = 'BUJ-001'$$, 'permission denied');
update public.products set price = 1700 where sku = 'BUJ-001';
select pg_temp.igual((select count(*) from public.price_changes), 1::bigint, 'cambios de precio registrados');

-- Operador: ventas, límites y permisos
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'salida', 9, null, 'Remito 123');
select pg_temp.igual((select balance_after from public.stock_movements order by id desc limit 1), 1.000, 'saldo tras la venta');
select pg_temp.igual((select status::text from public.product_status ps join public.products p on p.id = ps.product_id where p.sku = 'BUJ-001'), 'ultimas', 'estado bajo el mínimo');
select pg_temp.espera_error($$select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'salida', 5)$$, 'stock_insuficiente');
select pg_temp.espera_error($$select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'stock_inicial', 5)$$, 'no_autorizado');
select pg_temp.espera_error($$select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'entrada', 1.5)$$, 'cantidad_entera');
select pg_temp.espera_error($$select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'merma', 1)$$, 'motivo_obligatorio');
select pg_temp.espera_error($$select public.registrar_movimiento((select id from public.products where sku = 'BUJ-001'), 'entrada', 0)$$, 'cantidad_invalida');
select pg_temp.espera_error($$select public._aplicar_movimiento((select id from public.products where sku = 'BUJ-001'), 'entrada', 5, null, null, null)$$, 'permission denied');
select pg_temp.espera_error($$insert into public.stock_movements (product_id, type, quantity, user_id, balance_after) values (1, 'entrada', 1, auth.uid(), 1)$$, 'permission denied');
update public.products set price = 1 where sku = 'BUJ-001';
select pg_temp.igual((select price from public.products where sku = 'BUJ-001'), 1700.00, 'el operador no cambia precios');
select public.registrar_movimiento((select id from public.products where sku = 'BAR-001'), 'entrada', 2.5);
select pg_temp.igual((select stock from public.products where sku = 'BAR-001'), 2.500, 'decimales para metro');

-- Conteo físico y reversión
select public.registrar_conteo((select id from public.products where sku = 'BUJ-001'), 4);
select pg_temp.igual((select quantity from public.stock_movements order by id desc limit 1), 3.000, 'ajuste por conteo');
select pg_temp.igual(public.registrar_conteo((select id from public.products where sku = 'BUJ-001'), 4) is null, true, 'conteo sin diferencia');
select public.revertir_movimiento((select max(id) from public.stock_movements where type = 'ajuste'), 'Conté mal');
select pg_temp.igual((select stock from public.products where sku = 'BUJ-001'), 1.000, 'stock tras revertir');
select pg_temp.espera_error($$select public.revertir_movimiento((select max(id) from public.stock_movements where reverses_id is null and type = 'ajuste'), 'otra vez')$$, 'movimiento_ya_revertido');

-- Marcas, categorías y fotos (sigue el operador)
select pg_temp.espera_error($$insert into public.brands (name) values ('Otra')$$, 'row-level security');
select pg_temp.espera_error($$insert into public.product_photos (product_id, storage_path) values ((select id from public.products where sku = 'BUJ-001'), 'op.webp')$$, 'row-level security');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.espera_error($$delete from public.brands where name = 'Acme'$$, 'foreign key');
insert into public.categories (name) values ('Bujes');
update public.categories set name = 'Bujes y arandelas' where name = 'Bujes';
insert into public.product_photos (product_id, storage_path, sort_order)
  select (select id from public.products where sku = 'BUJ-001'), 'f' || n || '.webp', n from generate_series(1, 5) n;
select pg_temp.espera_error($$insert into public.product_photos (product_id, storage_path) values ((select id from public.products where sku = 'BUJ-001'), 'f6.webp')$$, 'maximo_fotos');
delete from public.product_photos where storage_path = 'f5.webp';
select pg_temp.igual((select count(*) from public.product_photos), 4::bigint, 'fotos tras borrar una');
select pg_temp.espera_error($$insert into public.products (sku, name, price) values ('BUJ-001', 'Repetido', 1)$$, 'duplicate key');

-- Quién activó el código: solo lo ve un admin con el código
reset role;
insert into auth.mfa_factors (user_id, factor_type, status) values
  ('00000000-0000-0000-0000-00000000000a', 'totp', 'verified'),
  ('00000000-0000-0000-0000-00000000000c', 'totp', 'unverified');
set role authenticated;
select pg_temp.igual((select array_agg(u) from public.usuarios_con_codigo() u), array['00000000-0000-0000-0000-00000000000a'::uuid], 'admins con código');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.igual((select count(*) from public.usuarios_con_codigo()), 0::bigint, 'el operador no ve quién tiene código');

-- Usuario dado de baja: sin acceso
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.espera_error($$select public.registrar_movimiento(1, 'entrada', 1)$$, 'no_autorizado');
select pg_temp.igual((select count(*) from public.products), 0::bigint, 'baja no ve productos');

-- Público: catálogo sin cantidades ni costo
reset request.jwt.claim.sub;
reset request.jwt.claim.aal;
set role anon;
select pg_temp.espera_error($$select * from public.usuarios_con_codigo()$$, 'permission denied');
select pg_temp.igual((select count(*) from public.catalogo_publico), 2::bigint, 'productos en el catálogo');
select pg_temp.igual((select status::text from public.catalogo_publico where sku = 'BUJ-001'), 'ultimas', 'estado en el catálogo');
select pg_temp.espera_error($$select stock from public.catalogo_publico$$, 'does not exist');
select pg_temp.espera_error($$select cost from public.catalogo_publico$$, 'does not exist');
select pg_temp.espera_error($$select * from public.products$$, 'permission denied');
select pg_temp.espera_error($$select * from public.stock_movements$$, 'permission denied');
select pg_temp.igual((select count(*) from public.product_photos), 4::bigint, 'fotos públicas de un producto visible');
select pg_temp.espera_error($$select public.registrar_movimiento(1, 'entrada', 1)$$, 'permission denied');
reset role;

\echo 'reglas.test.sql: todas las pruebas pasaron'
