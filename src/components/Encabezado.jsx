import { Link } from 'react-router'
import { useConfiguracion } from '../hooks/useConfiguracion.js'
import { useTema } from '../tema/contexto.js'

const Luna = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
)

const Sol = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

// El carrito no está acá: lo muestra la barra fija de abajo (BarraCarrito).
export default function Encabezado({ detalle }) {
  const config = useConfiguracion()
  const { oscuro, alternar } = useTema()
  return (
    <header className="border-b border-transparent bg-encabezado text-white dark:border-linea">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="truncate text-[17px] font-semibold">
          {config?.nombre_negocio || 'Catálogo'}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {detalle && <span className="text-[11px] text-white/75">{detalle}</span>}
          <button
            type="button"
            onClick={alternar}
            aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
          >
            {oscuro ? <Sol /> : <Luna />}
          </button>
        </div>
      </div>
    </header>
  )
}
