import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import { useConfiguracion } from '../hooks/useConfiguracion.js'
import { totalEstimado } from '../lib/carrito.js'
import { formatearCantidad, formatearPrecio } from '../lib/formato.js'
import { supabase } from '../lib/supabase.js'
import { armarMensaje, linkWhatsApp } from '../lib/whatsapp.js'

// Barra fija abajo con el resumen del carrito y la consulta por WhatsApp.
// Las pantallas que la muestran dejan lugar abajo con pb-28.
export default function BarraCarrito() {
  const { items } = useCarrito()
  const config = useConfiguracion()
  const [productos, setProductos] = useState({})
  const ids = items.map((i) => i.productId).sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!ids) return
    let vigente = true
    supabase
      .from('catalogo_publico')
      .select('id, name, brand_name, model, unit, price')
      .in('id', ids.split(',').map(Number))
      .then(({ data }) => vigente && data && setProductos(Object.fromEntries(data.map((p) => [p.id, p]))))
    return () => {
      vigente = false
    }
  }, [ids])

  if (items.length === 0) return null

  const publicados = items.filter((i) => productos[i.productId])
  const porUnidad = publicados.length === items.length && publicados.every((i) => productos[i.productId].unit === 'unidad')
  const unidades = items.reduce((s, i) => s + i.cantidad, 0)
  const resumen = [
    `${items.length} ${items.length === 1 ? 'producto' : 'productos'}`,
    porUnidad && `${formatearCantidad(unidades)} ${unidades === 1 ? 'unidad' : 'unidades'}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const enlace = linkWhatsApp(
    config?.whatsapp_numero,
    armarMensaje(publicados.map((i) => ({ ...productos[i.productId], cantidad: i.cantidad })), config?.nombre_negocio),
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl bg-barra py-2.5 pr-2.5 pl-4 text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]">
        <Link to="/carrito" className="min-w-0" aria-label={`Carrito: ${resumen}`}>
          <span className="block truncate text-[11px] text-white/75">{resumen}</span>
          <span className="block text-sm font-semibold tabular-nums">
            {publicados.length > 0 ? formatearPrecio(totalEstimado(publicados, productos)) : '…'}
          </span>
        </Link>
        {enlace && publicados.length > 0 ? (
          <a href={enlace} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-[10px] bg-whatsapp px-3 py-2.5 text-[13px] font-semibold text-white hover:brightness-95">
            Consultar por WhatsApp
          </a>
        ) : (
          <Link to="/carrito" className="shrink-0 rounded-[10px] bg-white/15 px-3 py-2.5 text-[13px] font-semibold">
            Ir al carrito
          </Link>
        )}
      </div>
    </div>
  )
}
