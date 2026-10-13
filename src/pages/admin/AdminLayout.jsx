import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { salir } from '../../auth/acciones.js'
import { useAuth } from '../../auth/contexto.js'
import BotonTema from '../../components/BotonTema.jsx'
import { useConfiguracion } from '../../hooks/useConfiguracion.js'

const SECCIONES = [
  { to: '/admin', etiqueta: 'Tablero', end: true },
  { to: '/admin/productos', etiqueta: 'Productos' },
  { to: '/admin/movimientos', etiqueta: 'Movimientos' },
  { to: '/admin/marcas-categorias', etiqueta: 'Marcas y categorías', soloAdmin: true },
  { to: '/admin/usuarios', etiqueta: 'Usuarios', soloAdmin: true },
  { to: '/admin/configuracion', etiqueta: 'Configuración', soloAdmin: true },
]

const ETIQUETA_ROL = { admin: 'Administrador', operador: 'Operador' }

// En escritorio, el botón flotante tapa campos en los formularios largos; ahí no hace
// falta porque la ficha del producto ya tiene su propio "Registrar movimiento".
const sinBotonFlotante = (ruta) => ruta === '/admin/movimientos/nuevo' || ruta.startsWith('/admin/productos/')

const Icono = ({ d }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]">
    <path d={d} />
  </svg>
)
const ICONOS = {
  tablero: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
  productos: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  historial: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
}

function Pestana({ to, end, icono, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `grid justify-items-center gap-0.5 py-1 text-[11px] ${isActive ? 'font-semibold text-tinta' : 'text-suave'}`
      }
    >
      <Icono d={ICONOS[icono]} />
      {children}
    </NavLink>
  )
}

// Hoja que sube desde abajo con las secciones que no entran en la barra del celular.
function MenuMas({ secciones, perfil, alCerrar }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && alCerrar()
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [alCerrar])

  return (
    <div className="fixed inset-0 z-30 md:hidden">
      <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-black/45" onClick={alCerrar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Más opciones"
        className="absolute inset-x-0 bottom-0 grid rounded-t-2xl bg-superficie px-3.5 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
      >
        <span aria-hidden="true" className="mb-2 h-1 w-9 justify-self-center rounded-full bg-linea" />
        <div className="divide-y divide-linea">
          {secciones.map((s) => (
            <Link key={s.to} to={s.to} onClick={alCerrar} className="flex items-center justify-between px-1 py-3 text-sm font-medium">
              {s.etiqueta}
              <span aria-hidden="true" className="text-lg text-suave">›</span>
            </Link>
          ))}
        </div>
        <div className={`flex items-center justify-between gap-2 px-1 ${secciones.length ? 'mt-1.5 border-t border-linea pt-3.5' : ''}`}>
          <div>
            <p className="text-[13px] font-semibold">{perfil?.name}</p>
            <p className="text-[11px] text-suave">{ETIQUETA_ROL[perfil?.role]}</p>
          </div>
          <button type="button" className="btn-secundario" onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { perfil } = useAuth()
  const config = useConfiguracion()
  const [masAbierto, setMasAbierto] = useState(false)
  const { pathname } = useLocation()
  const secciones = SECCIONES.filter((s) => !s.soloAdmin || perfil?.role === 'admin')
  const enMas = SECCIONES.some((s) => s.soloAdmin && pathname.startsWith(s.to))
  const negocio = config?.nombre_negocio

  const enlace = ({ isActive }) =>
    `block rounded-md px-2.5 py-2 text-[13px] ${isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/80 hover:bg-white/10'}`

  return (
    <div className="min-h-dvh md:flex">
      {/* Celular: encabezado arriba y barra de navegación abajo */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-transparent bg-encabezado py-3 pr-3 pl-3.5 text-white md:hidden dark:border-linea">
        <div className="min-w-0">
          <p className="text-[17px] leading-tight font-semibold">Panel</p>
          {negocio && <p className="truncate text-[11px] text-encabezado-suave">{negocio}</p>}
        </div>
        <BotonTema />
      </header>

      {/* Escritorio: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh w-58 shrink-0 flex-col bg-encabezado text-white md:flex dark:border-r dark:border-linea">
        <div className="flex items-center justify-between gap-2 pt-4 pr-3.5 pb-3.5 pl-4.5">
          <div className="min-w-0">
            <p className="text-[17px] leading-tight font-semibold">Panel</p>
            {negocio && <p className="truncate text-[11px] text-encabezado-suave">{negocio}</p>}
          </div>
          <BotonTema />
        </div>
        <nav className="space-y-0.5 px-2.5" aria-label="Secciones">
          {secciones.map((s) => (
            <NavLink key={s.to} to={s.to} end={s.end} className={enlace}>
              {s.etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-px border-t border-white/15 px-4.5 pt-3.5 pb-4.5">
          <p className="text-[13px] font-semibold">{perfil?.name}</p>
          <p className="text-[11px] text-encabezado-suave">{ETIQUETA_ROL[perfil?.role]}</p>
          <button
            type="button"
            className="mt-2 justify-self-start rounded-full border border-white/35 px-3 py-0.5 text-[13px] hover:bg-white/10"
            onClick={salir}
          >
            Salir
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-3 pt-3.5 pb-28 md:px-8 md:pt-7 md:pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-end border-t border-linea bg-superficie px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
      >
        <Pestana to="/admin" end icono="tablero">Tablero</Pestana>
        <Pestana to="/admin/productos" icono="productos">Productos</Pestana>
        <NavLink to="/admin/movimientos/nuevo" className="grid justify-items-center gap-0.5 text-[11px] font-semibold text-accion">
          <span
            aria-hidden="true"
            className="-mt-6 grid h-11 w-11 place-items-center rounded-full border-3 border-superficie bg-accion text-2xl leading-none text-accion-texto shadow-lg"
          >
            +
          </span>
          Movimiento
        </NavLink>
        <Pestana to="/admin/movimientos" end icono="historial">Historial</Pestana>
        <button
          type="button"
          aria-expanded={masAbierto}
          onClick={() => setMasAbierto(true)}
          className={`grid justify-items-center gap-0.5 py-1 text-[11px] ${enMas ? 'font-semibold text-tinta' : 'text-suave'}`}
        >
          <Icono d={ICONOS.mas} />
          Más
        </button>
      </nav>
      {masAbierto && (
        <MenuMas secciones={secciones.filter((s) => s.soloAdmin)} perfil={perfil} alCerrar={() => setMasAbierto(false)} />
      )}

      {!sinBotonFlotante(pathname) && (
        <Link
          to="/admin/movimientos/nuevo"
          className="fixed right-6 bottom-6 hidden rounded-full bg-accion px-4 py-3 text-sm font-semibold text-accion-texto shadow-lg hover:brightness-110 md:block"
        >
          + Movimiento
        </Link>
      )}
    </div>
  )
}
