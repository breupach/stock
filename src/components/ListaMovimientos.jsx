import { useState } from 'react'
import { Link } from 'react-router'
import { formatearCantidad } from '../lib/formato.js'
import { ETIQUETA_TIPO, mensajeErrorMovimiento } from '../lib/movimientos.js'
import { UNIDADES } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })

function Fila({ m, nombres, mostrarProducto, alCambiar }) {
  const [error, setError] = useState(null)
  const unidad = UNIDADES[m.products?.unit]?.toLowerCase() ?? ''
  const positivo = Number(m.quantity) > 0

  async function revertir() {
    const motivo = window.prompt('¿Por qué revertís este movimiento?')
    if (motivo === null) return
    setError(null)
    const { error } = await supabase.rpc('revertir_movimiento', { p_movement_id: m.id, p_reason: motivo })
    if (error) setError(mensajeErrorMovimiento(error))
    else alCambiar?.()
  }

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <span className="font-medium">{m.reverses_id ? 'Reversión' : ETIQUETA_TIPO[m.type]}</span>
          {mostrarProducto && m.products && (
            <>
              {' · '}
              <Link to={`/admin/productos/${m.product_id}`} className="hover:underline">{m.products.name}</Link>
            </>
          )}
          {m.revertido && <span className="ml-2 rounded bg-stone-200 px-1.5 text-xs">Revertido</span>}
        </div>
        <div className="text-right">
          <span className={`font-semibold ${positivo ? 'text-disponible' : 'text-sin-stock'}`}>
            {positivo ? '+' : ''}{formatearCantidad(m.quantity)} {unidad}
          </span>
          <span className="ml-2 text-sm text-stone-500">saldo {formatearCantidad(m.balance_after)}</span>
        </div>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-500">
        <span>
          {fecha.format(new Date(m.created_at))}
          {nombres[m.user_id] && ` · ${nombres[m.user_id]}`}
          {m.reason && ` · ${m.reason}`}
          {m.reference && ` · Ref. ${m.reference}`}
        </span>
        {alCambiar && !m.reverses_id && !m.revertido && (
          <button type="button" onClick={revertir} className="text-marca underline">
            Revertir
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-sin-stock">{error}</p>}
    </li>
  )
}

// alCambiar: si se pasa, cada movimiento muestra "Revertir" y lo llama al terminar.
export default function ListaMovimientos({ movimientos, nombres = {}, mostrarProducto = true, alCambiar, vacio = 'No hay movimientos.' }) {
  if (movimientos.length === 0) return <p className="text-sm text-stone-500">{vacio}</p>
  return (
    <ul className="divide-y divide-stone-100">
      {movimientos.map((m) => (
        <Fila key={m.id} m={m} nombres={nombres} mostrarProducto={mostrarProducto} alCambiar={alCambiar} />
      ))}
    </ul>
  )
}
