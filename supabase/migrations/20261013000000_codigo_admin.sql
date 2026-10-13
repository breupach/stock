-- Código de seguridad (Google Authenticator) para administradores.
--
-- Un administrador solo actúa como tal cuando su sesión pasó el segundo paso
-- (aal2 en el token de Supabase). Con solo la contraseña (aal1) no tiene rol:
-- no puede escribir ni leer nada del panel, salvo su propio perfil, que la app
-- necesita para saber que le tiene que pedir el código.

create or replace function public.rol_actual()
returns public.rol_usuario
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.active
    and (p.role <> 'admin' or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
$$;

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.es_personal());

-- Administradores que ya activaron el código, para mostrarlo en Usuarios.
create function public.usuarios_con_codigo()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select distinct f.user_id from auth.mfa_factors f
  where f.factor_type = 'totp' and f.status = 'verified' and public.es_admin()
$$;

revoke execute on function public.usuarios_con_codigo() from public, anon;
grant execute on function public.usuarios_con_codigo() to authenticated;
