import { Link } from 'react-router'
import { useConfiguracion } from '../hooks/useConfiguracion.js'
import BotonTema from './BotonTema.jsx'

// El carrito no está acá: lo muestra la barra fija de abajo (BarraCarrito).
export default function Encabezado({ detalle }) {
  const config = useConfiguracion()
  return (
    <header className="border-b border-transparent bg-encabezado text-white dark:border-linea">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="truncate text-[17px] font-semibold">
          {config?.nombre_negocio || 'Catálogo'}
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {detalle && <span className="text-[11px] text-white/75">{detalle}</span>}
          <BotonTema />
        </div>
      </div>
    </header>
  )
}
