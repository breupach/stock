-- Ajustes de permisos de fotos.

-- 1. El público no tiene permiso sobre products, así que la política original no
--    podía consultar esa tabla y la lectura de fotos fallaba sin login. Se usa la
--    vista del catálogo, que ya define qué productos están publicados.
drop policy product_photos_select on public.product_photos;
create policy product_photos_select on public.product_photos
  for select to anon, authenticated
  using (
    public.es_personal()
    or exists (select 1 from public.catalogo_publico c where c.id = product_id)
  );

-- 2. Borrar un archivo de Storage necesita también permiso de lectura sobre el
--    objeto. Las fotos se sirven por la URL pública del bucket, así que esta
--    política solo hace falta para que el admin pueda borrarlas.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    create policy fotos_admin_select on storage.objects
      for select to authenticated
      using (bucket_id = 'fotos' and public.es_admin());
  end if;
end;
$$;
