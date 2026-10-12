import { useState } from 'react'
import { Link } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import { cantidadValida } from '../lib/carrito.js'
import { formatearCantidad } from '../lib/formato.js'
import { UNIDADES } from '../lib/productos.js'

// Con el producto ya en el carrito: − y + de a uno, y el número se puede escribir
// para cantidades exactas (por ejemplo, 2,5 metros). Restar desde 1 lo saca del carrito.
function CantidadEnCarrito({ producto, item }) {
  const { agregar, cambiar } = useCarrito()
  const [texto, setTexto] = useState(formatearCantidad(item.cantidad))
  const [error, setError] = useState(false)

  function confirmar() {
    const n = cantidadValida(texto.replace(/\./g, ''), producto.unit)
    if (n === null) return setError(true)
    setError(false)
    if (n !== item.cantidad) cambiar(producto.id, n)
  }

  const paso = 'grid w-11 shrink-0 place-items-center text-xl leading-none hover:bg-accion/15'
  return (
    <div>
      <div className="flex h-11 items-stretch overflow-hidden rounded-md border border-accion bg-accion-suave font-semibold text-accion">
        <button type="button" className={paso} aria-label={`Quitar uno de ${producto.name}`} onClick={() => cambiar(producto.id, item.cantidad - 1)}>
          −
        </button>
        <label className="flex flex-1 items-center justify-center gap-2 text-sm">
          En el carrito
          <input
            aria-label="Cantidad en el carrito"
            aria-invalid={error}
            inputMode={producto.unit === 'unidad' ? 'numeric' : 'decimal'}
            className={`w-14 rounded-md border bg-superficie px-1.5 py-0.5 text-center tabular-nums ${error ? 'border-sin-stock' : 'border-accion'}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e) => e.key === 'Enter' && confirmar()}
          />
        </label>
        <button type="button" className={paso} aria-label={`Sumar uno de ${producto.name}`} onClick={() => agregar(producto.id, 1)}>
          +
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-sin-stock">{producto.unit === 'unidad' ? 'Ingresá una cantidad entera.' : 'Ingresá una cantidad mayor a cero.'}</p>}
    </div>
  )
}

export default function AgregarAlCarrito({ producto }) {
  const { items, agregar } = useCarrito()
  const [cantidad, setCantidad] = useState('1')
  const [error, setError] = useState(null)
  const [agregado, setAgregado] = useState(false)
  const enCarrito = items.find((i) => i.productId === producto.id)
  const porUnidad = producto.unit === 'unidad'
  const etiqueta = `Cantidad${porUnidad ? '' : ` (${UNIDADES[producto.unit]?.toLowerCase()})`}`

  if (producto.status === 'sin_stock') {
    return <p className="mt-6 rounded-md bg-foto px-3 py-2 text-sm text-suave">Sin stock por ahora. Volvé a fijarte más adelante.</p>
  }

  if (enCarrito) {
    return (
      <div className="mt-6 max-w-sm space-y-2">
        <p className="text-sm font-medium">{etiqueta}</p>
        {/* La key reinicia el campo cuando la cantidad cambia con − o +, o desde otra pestaña. */}
        <CantidadEnCarrito key={enCarrito.cantidad} producto={producto} item={enCarrito} />
        {agregado && (
          <p role="status" className="text-sm text-disponible">
            Agregado. Tenés {formatearCantidad(enCarrito.cantidad)} en el carrito.{' '}
            <Link to="/carrito" className="text-tinta underline">Ver carrito</Link>
          </p>
        )}
      </div>
    )
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
          <span className="text-sm font-medium">{etiqueta}</span>
          <input
            className="mt-1 block w-24 rounded-md border border-linea bg-superficie px-3 py-2"
            inputMode={porUnidad ? 'numeric' : 'decimal'}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <button type="submit" className="rounded-md bg-accion px-4 py-2.5 font-semibold text-white hover:brightness-95">
          Agregar al carrito
        </button>
      </div>
      {error && <p className="text-sm text-sin-stock">{error}</p>}
    </form>
  )
}
