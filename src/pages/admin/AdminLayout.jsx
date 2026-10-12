import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { salir } from '../../auth/acciones.js'
import { useAuth } from '../../auth/contexto.js'

const SECCIONES = [
  { to: '/admin', etiqueta: 'Tablero', end: true },
  { to: '/admin/productos', etiqueta: 'Productos' },
  { to: '/admin/movimientos', etiqueta: 'Movimientos' },
  { to: '/admin/marcas-categorias', etiqueta: 'Marcas y categorías', soloAdmin: true },
  { to: '/admin/usuarios', etiqueta: 'Usuarios', soloAdmin: true },
  { to: '/admin/configuracion', etiqueta: 'Configuración', soloAdmin: true },
]

export default function AdminLayout() {
  const { perfil } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  const secciones = SECCIONES.filter((s) => !s.soloAdmin || perfil?.role === 'admin')

  const enlace = ({ isActive }) =>
    `block rounded-md px-3 py-2 ${isActive ? 'bg-white/15 font-medium' : 'hover:bg-white/10'}`

  return (
    <div className="min-h-dvh md:flex">
      <header className="bg-marca text-white md:w-60 md:shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold">Panel</span>
          <button
            type="button"
            className="rounded-md px-3 py-2 md:hidden"
            aria-expanded={abierto}
            onClick={() => setAbierto(!abierto)}
          >
            Menú
          </button>
        </div>
        <nav className={`${abierto ? 'block' : 'hidden'} space-y-1 px-2 pb-3 md:block`}>
          {secciones.map((s) => (
            <NavLink key={s.to} to={s.to} end={s.end} className={enlace} onClick={() => setAbierto(false)}>
              {s.etiqueta}
            </NavLink>
          ))}
          <div className="mt-3 border-t border-white/20 px-3 pt-3 text-sm text-white/80">
            <p>{perfil?.name}</p>
            <button type="button" className="mt-1 underline" onClick={salir}>
              Salir
            </button>
          </div>
        </nav>
      </header>
      <main className="flex-1 px-4 pt-6 pb-24">
        <Outlet />
      </main>
      {pathname !== '/admin/movimientos/nuevo' && (
        <Link
          to="/admin/movimientos/nuevo"
          className="fixed right-4 bottom-4 rounded-full bg-marca px-5 py-3 font-medium text-white shadow-lg hover:bg-marca-oscuro"
        >
          + Movimiento
        </Link>
      )}
    </div>
  )
}
