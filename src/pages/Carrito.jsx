import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import Encabezado from '../components/Encabezado.jsx'
import EstadoStock from '../components/EstadoStock.jsx'
import { useConfiguracion } from '../hooks/useConfiguracion.js'
import { useEstadosEnVivo } from '../hooks/useEstadosEnVivo.js'
import { cantidadValida, totalEstimado } from '../lib/carrito.js'
import { fotoPrincipal } from '../lib/catalogo.js'
import { formatearPrecio } from '../lib/formato.js'
import { urlFoto } from '../lib/fotos.js'
import { UNIDADES } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'
import { armarMensaje, linkWhatsApp } from '../lib/whatsapp.js'

function Cantidad({ item, unidad, alCambiar }) {
  const [texto, setTexto] = useState(String(item.cantidad))
  const [error, setError] = useState(false)

  function confirmar() {
    const n = cantidadValida(texto, unidad)
    if (n === null) return setError(true)
    setError(false)
    if (n !== item.cantidad) alCambiar(n)
  }

  return (
    <input
      aria-label="Cantidad"
      aria-invalid={error}
      className={`w-20 rounded-md border px-2 py-1.5 ${error ? 'border-sin-stock' : 'border-linea'}`}
      inputMode={unidad === 'unidad' ? 'numeric' : 'decimal'}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === 'Enter' && confirmar()}
    />
  )
}

export default function Carrito() {
  const { items, cambiar, quitar, vaciar } = useCarrito()
  const config = useConfiguracion()
  const [productos, setProductos] = useState(null)
  const [fotos, setFotos] = useState({})
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const ids = items.map((i) => i.productId).sort((a, b) => a - b).join(',')

  useEffect(() => {
    if (!ids) return
    let vigente = true
    const lista = ids.split(',').map(Number)
    Promise.all([
      supabase.from('catalogo_publico').select('id, name, brand_name, model, unit, price, status').in('id', lista),
      supabase.from('product_photos').select('product_id, storage_path, sort_order').in('product_id', lista),
    ]).then(([p, f]) => {
      if (!vigente) return
      if (p.error) return setError('No se pudo cargar el carrito. Probá recargar la página.')
      setError(null)
      setProductos(Object.fromEntries(p.data.map((x) => [x.id, x])))
      setFotos(fotoPrincipal(f.data ?? []))
    })
    return () => {
      vigente = false
    }
  }, [ids, version])

  // Si un producto pasa a Sin stock mientras el cliente mira el carrito, se marca; no se quita.
  const alCambiarEstado = useCallback((id, estado) => {
    setProductos((ps) => (ps?.[id] ? { ...ps, [id]: { ...ps[id], status: estado } } : ps))
  }, [])
  useEstadosEnVivo({ alCambiar: alCambiarEstado, alReconectar: () => setVersion((v) => v + 1) })

  const publicados = productos ? items.filter((i) => productos[i.productId]) : []
  const mensaje = armarMensaje(
    publicados.map((i) => ({ ...productos[i.productId], cantidad: i.cantidad })),
    config?.nombre_negocio,
  )
  const enlace = linkWhatsApp(config?.whatsapp_numero, mensaje)

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">Carrito</h1>
        {items.length === 0 && (
          <p className="text-suave">
            Tu carrito está vacío. <Link to="/" className="text-tinta underline">Ver el catálogo</Link>
          </p>
        )}
        {error && <p className="text-sin-stock">{error}</p>}
        {items.length > 0 && !error && productos === null && <p className="text-suave">Cargando…</p>}

        {items.length > 0 && productos && (
          <>
            <ul className="divide-y divide-linea rounded-lg border border-linea bg-superficie">
              {items.map((item) => {
                const p = productos[item.productId]
                if (!p) {
                  return (
                    <li key={item.productId} className="flex items-center justify-between gap-3 p-3">
                      <span className="text-suave">Un producto de tu carrito ya no está publicado.</span>
                      <button type="button" className="text-sm text-tinta underline" onClick={() => quitar(item.productId)}>
                        Quitar
                      </button>
                    </li>
                  )
                }
                const unidad = UNIDADES[p.unit]?.toLowerCase()
                return (
                  <li key={item.productId} className="flex gap-3 p-3">
                    <Link to={`/producto/${p.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-foto">
                      {fotos[p.id] && <img src={urlFoto(fotos[p.id])} alt="" className="h-full w-full object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link to={`/producto/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                          <p className="font-mono text-[11px] text-suave">{[p.brand_name, p.model].filter(Boolean).join(' · ')}</p>
                        </div>
                        <EstadoStock estado={p.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                        <Cantidad key={item.cantidad} item={item} unidad={p.unit} alCambiar={(n) => cambiar(p.id, n)} />
                        {p.unit !== 'unidad' && <span className="text-suave">{unidad}</span>}
                        <span className="text-suave">× {formatearPrecio(p.price)}</span>
                        <span className="ml-auto font-semibold">{formatearPrecio(Number(p.price) * item.cantidad)}</span>
                        <button type="button" className="text-tinta underline" onClick={() => quitar(p.id)}>
                          Quitar
                        </button>
                      </div>
                      {p.status === 'sin_stock' && (
                        <p className="mt-1 text-sm text-sin-stock">Se quedó sin stock. Igual podés consultarlo.</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            {publicados.length > 0 && (
              <div className="mt-4 flex items-baseline justify-between px-1">
                <span className="text-suave">Total estimado</span>
                <span className="text-xl font-semibold text-tinta tabular-nums">{formatearPrecio(totalEstimado(publicados, productos))}</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {enlace && publicados.length > 0 ? (
                <a href={enlace} target="_blank" rel="noopener noreferrer" className="rounded-md bg-whatsapp px-5 py-3 font-medium text-white hover:brightness-95">
                  Consultar por WhatsApp
                </a>
              ) : (
                config && !enlace && <p className="text-sm text-suave">La consulta por WhatsApp todavía no está habilitada.</p>
              )}
              <button type="button" className="text-sm text-suave underline" onClick={() => window.confirm('¿Vaciar el carrito?') && vaciar()}>
                Vaciar carrito
              </button>
            </div>
            <p className="mt-3 text-sm text-suave">
              Se abre WhatsApp con tu pedido escrito para que lo envíes. No es una compra: te respondemos con la confirmación.
            </p>
          </>
        )}
      </main>
    </>
  )
}
