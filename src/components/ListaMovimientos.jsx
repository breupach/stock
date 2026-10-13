import { useState } from 'react'
import { Link } from 'react-router'
import { formatearCantidad } from '../lib/formato.js'
import { ETIQUETA_TIPO, mensajeErrorMovimiento } from '../lib/movimientos.js'
import { unidadPara } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })

function Fila({ m, nombres, mostrarProducto, alCambiar }) {
  const [error, setError] = useState(null)
  const unidad = unidadPara(m.products?.unit, m.quantity)
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
          <span className="text-[13px] font-semibold">{m.reverses_id ? 'Reversión' : ETIQUETA_TIPO[m.type]}</span>
          {mostrarProducto && m.products && (
            <>
              {' · '}
              <Link to={`/admin/productos/${m.product_id}`} className="text-[13px] font-medium text-tinta hover:underline">{m.products.name}</Link>
            </>
          )}
          {m.revertido && <span className="ml-1.5 rounded bg-foto px-1.5 py-px text-[11px] font-medium text-suave">Revertido</span>}
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold tabular-nums ${positivo ? 'text-disponible' : 'text-sin-stock'}`}>
            {positivo ? '+' : '−'}{formatearCantidad(Math.abs(Number(m.quantity)))} {unidad}
          </span>
          <span className="ml-2 font-mono text-[11px] text-suave">saldo {formatearCantidad(m.balance_after)}</span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-suave">
        <span>
          {fecha.format(new Date(m.created_at))}
          {nombres[m.user_id] && ` · ${nombres[m.user_id]}`}
          {m.reason && ` · ${m.reason}`}
          {m.reference && ` · Ref. ${m.reference}`}
        </span>
        {alCambiar && !m.reverses_id && !m.revertido && (
          <button type="button" onClick={revertir} className="rounded-md border border-linea px-2 py-0.5 text-[11px] font-semibold text-tinta hover:border-tinta">
            Revertir
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-[13px] text-sin-stock">{error}</p>}
    </li>
  )
}

// alCambiar: si se pasa, cada movimiento muestra "Revertir" y lo llama al terminar.
export default function ListaMovimientos({ movimientos, nombres = {}, mostrarProducto = true, alCambiar, vacio = 'No hay movimientos.' }) {
  if (movimientos.length === 0) return <p className="py-2 text-[13px] text-suave">{vacio}</p>
  return (
    <ul className="divide-y divide-linea">
      {movimientos.map((m) => (
        <Fila key={m.id} m={m} nombres={nombres} mostrarProducto={mostrarProducto} alCambiar={alCambiar} />
      ))}
    </ul>
  )
}
