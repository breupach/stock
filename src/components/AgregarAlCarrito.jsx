import { useState } from 'react'
import { Link } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import { cantidadValida } from '../lib/carrito.js'
import { formatearCantidad } from '../lib/formato.js'
import { UNIDADES } from '../lib/productos.js'

export default function AgregarAlCarrito({ producto }) {
  const { items, agregar } = useCarrito()
  const [cantidad, setCantidad] = useState('1')
  const [error, setError] = useState(null)
  const [agregado, setAgregado] = useState(false)
  const enCarrito = items.find((i) => i.productId === producto.id)
  const porUnidad = producto.unit === 'unidad'

  if (producto.status === 'sin_stock') {
    return <p className="mt-6 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-600">Sin stock por ahora. Volvé a fijarte más adelante.</p>
  }

  function enviar(e) {
    e.preventDefault()
    const n = cantidadValida(cantidad, producto.unit)
    if (n === null) return setError(porUnidad ? 'Ingresá una cantidad entera.' : 'Ingresá una cantidad mayor a cero.')
    setError(null)
    agregar(producto.id, n)
    setAgregado(true)
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-2">
      <div className="flex items-end gap-3">
        <label>
          <span className="text-sm font-medium">Cantidad{!porUnidad && ` (${UNIDADES[producto.unit]?.toLowerCase()})`}</span>
          <input
            className="mt-1 block w-24 rounded-md border border-stone-300 px-3 py-2"
            inputMode={porUnidad ? 'numeric' : 'decimal'}
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value)
              setAgregado(false)
            }}
          />
        </label>
        <button type="submit" className="rounded-md bg-marca px-4 py-2.5 font-medium text-white hover:bg-marca-oscuro">
          Agregar al carrito
        </button>
      </div>
      {error && <p className="text-sm text-sin-stock">{error}</p>}
      {agregado && enCarrito && (
        <p role="status" className="text-sm text-disponible">
          Agregado. Tenés {formatearCantidad(enCarrito.cantidad)} en el carrito.{' '}
          <Link to="/carrito" className="text-marca underline">Ver carrito</Link>
        </p>
      )}
    </form>
  )
}
