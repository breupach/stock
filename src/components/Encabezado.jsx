import { Link } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import { useConfiguracion } from '../hooks/useConfiguracion.js'

export default function Encabezado() {
  const { items } = useCarrito()
  const config = useConfiguracion()
  return (
    <header className="bg-marca text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-semibold">
          {config?.nombre_negocio || 'Catálogo'}
        </Link>
        <Link to="/carrito" className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25">
          Carrito{items.length > 0 && ` (${items.length})`}
        </Link>
      </div>
    </header>
  )
}
