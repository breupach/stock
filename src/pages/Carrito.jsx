import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import Encabezado from '../components/Encabezado.jsx'
import EstadoStock from '../components/EstadoStock.jsx'
import { useConfiguracion } from '../hooks/useConfiguracion.js'
import { useEstadosEnVivo } from '../hooks/useEstadosEnVivo.js'
import { cantidadValida, resumenCarrito, totalEstimado } from '../lib/carrito.js'
import { fotoPrincipal } from '../lib/catalogo.js'
import { formatearCantidad, formatearPrecio } from '../lib/formato.js'
import { urlFoto } from '../lib/fotos.js'
import { UNIDADES } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'
import { armarMensaje, linkWhatsApp } from '../lib/whatsapp.js'

// "− N +" como en la ficha, más compacto: el número se puede escribir (por ejemplo 2,5 metros)
// y restar desde 1 saca el producto del carrito.
function Cantidad({ producto, item, alCambiar }) {
  const [texto, setTexto] = useState(formatearCantidad(item.cantidad))
  const [error, setError] = useState(false)

  function confirmar() {
    const n = cantidadValida(texto.replace(/\./g, ''), producto.unit)
    if (n === null) return setError(true)
    setError(false)
    if (n !== item.cantidad) alCambiar(n)
  }

  const paso = 'grid w-8 place-items-center text-base leading-none hover:bg-accion/15'
  return (
    <div>
      <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-accion bg-accion-suave font-semibold text-accion">
        <button type="button" className={paso} aria-label={`Quitar uno de ${producto.name}`} onClick={() => alCambiar(item.cantidad - 1)}>
          −
        </button>
        <input
          aria-label={`Cantidad de ${producto.name}`}
          aria-invalid={error}
          inputMode={producto.unit === 'unidad' ? 'numeric' : 'decimal'}
          className={`w-11 border-x bg-superficie text-center text-[13px] text-texto tabular-nums ${error ? 'border-sin-stock' : 'border-accion'}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
        />
        <button type="button" className={paso} aria-label={`Sumar uno de ${producto.name}`} onClick={() => alCambiar(item.cantidad + 1)}>
          +
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-sin-stock">{producto.unit === 'unidad' ? 'Ingresá una cantidad entera.' : 'Ingresá una cantidad mayor a cero.'}</p>}
    </div>
  )
}

export default function Carrito() {
  const { items, cambiar, quitar, vaciar } = useCarrito()
  const navegar = useNavigate()
  const desde = useLocation().state?.desde
  // "← Catálogo" vuelve al listado con la búsqueda y filtros con los que se abrió el carrito.
  const volver = () => navegar(typeof desde === 'string' && /^\/(\?|$)/.test(desde) ? desde : '/')
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
      supabase.from('catalogo_publico').select('id, name, brand_name, model, year, unit, price, status').in('id', lista),
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

  const listo = items.length > 0 && productos
  return (
    <>
      <Encabezado />
      <main className={`mx-auto max-w-3xl px-4 pt-4 ${listo ? 'pb-48' : 'pb-8'}`}>
        <button
          type="button"
          onClick={volver}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-linea bg-superficie py-1.5 pr-3 pl-2.5 text-[13px] font-semibold text-tinta hover:border-tinta"
        >
          <span aria-hidden="true">←</span> Catálogo
        </button>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold">Carrito</h1>
          {listo && <span className="text-[13px] text-suave">{resumenCarrito(items, productos)}</span>}
        </div>
        {items.length === 0 && (
          <div className="grid justify-items-center gap-2.5 px-6 pt-16 text-center">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-14 w-14 fill-none stroke-suave" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2.2l2.3 10.5h10.3L20 7.5H6.4" />
              <circle cx="9.5" cy="19" r="1.4" />
              <circle cx="16.5" cy="19" r="1.4" />
            </svg>
            <p className="text-[17px] font-semibold">Tu carrito está vacío</p>
            <p className="max-w-[24ch] text-[13px] text-suave">Agregá productos desde el catálogo para consultarlos por WhatsApp.</p>
            <Link to="/" className="mt-1.5 rounded-md border border-accion px-4 py-2 text-[13px] font-semibold text-accion hover:bg-accion-suave">
              Ver el catálogo
            </Link>
          </div>
        )}
        {error && <p className="text-sin-stock">{error}</p>}
        {items.length > 0 && !error && productos === null && <p className="text-suave">Cargando…</p>}

        {listo && (
          <>
            <ul className="divide-y divide-linea rounded-lg border border-linea bg-superficie">
              {items.map((item) => {
                const p = productos[item.productId]
                if (!p) {
                  return (
                    <li key={item.productId} className="flex items-center justify-between gap-3 p-3">
                      <span className="text-[13px] text-suave">Un producto de tu carrito ya no está publicado.</span>
                      <button type="button" className="text-[13px] text-tinta underline" onClick={() => quitar(item.productId)}>
                        Quitar
                      </button>
                    </li>
                  )
                }
                const porUnidad = p.unit === 'unidad'
                const aplicacion = [p.brand_name, p.model, p.year].filter(Boolean).join(' · ')
                return (
                  <li key={item.productId} className="flex gap-2.5 p-2.5">
                    <Link to={`/producto/${p.id}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-foto" tabIndex={-1} aria-hidden="true">
                      {fotos[p.id] && <img src={urlFoto(fotos[p.id])} alt="" className="h-full w-full object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/producto/${p.id}`} className="text-sm leading-tight font-semibold hover:underline">{p.name}</Link>
                        <button
                          type="button"
                          aria-label={`Quitar ${p.name} del carrito`}
                          className="-mt-1 -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[15px] text-suave hover:bg-foto"
                          onClick={() => quitar(p.id)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {aplicacion && <span className="font-mono text-[11px] text-suave">{aplicacion}</span>}
                        <EstadoStock estado={p.status} />
                      </div>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        {/* La key reinicia el campo cuando la cantidad cambia con − o +, o desde otra pestaña. */}
                        <Cantidad key={item.cantidad} producto={p} item={item} alCambiar={(n) => cambiar(p.id, n)} />
                        <div className="text-right">
                          <p className="text-[11px] text-suave tabular-nums">
                            {formatearPrecio(p.price)} {porUnidad ? 'c/u' : `/ ${UNIDADES[p.unit]?.toLowerCase() ?? p.unit}`}
                          </p>
                          <p className="text-sm font-semibold tabular-nums">{formatearPrecio(Number(p.price) * item.cantidad)}</p>
                        </div>
                      </div>
                      {p.status === 'sin_stock' && (
                        <p className="mt-1 text-[11px] text-sin-stock">Se quedó sin stock. Igual podés consultarlo.</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            <button type="button" className="mt-3 text-[13px] text-suave underline" onClick={() => window.confirm('¿Vaciar el carrito?') && vaciar()}>
              Vaciar carrito
            </button>
            <p className="mt-2 text-[11px] text-suave">
              Se abre WhatsApp con tu pedido escrito para que lo envíes. No es una compra: te respondemos con la confirmación.
            </p>

            <div className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto grid max-w-xl gap-2.5 rounded-2xl border-2 border-borde-barra bg-barra p-3 text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]">
                <div className="flex items-baseline justify-between gap-3 px-0.5">
                  <span className="text-[11px] text-white/75">Total estimado</span>
                  <span className="text-[17px] font-semibold tabular-nums">{formatearPrecio(totalEstimado(publicados, productos))}</span>
                </div>
                {enlace && publicados.length > 0 ? (
                  <a href={enlace} target="_blank" rel="noopener noreferrer" className="rounded-[10px] bg-whatsapp px-3 py-3 text-center text-sm font-semibold text-white hover:brightness-95">
                    Consultar por WhatsApp
                  </a>
                ) : (
                  config && !enlace && <p className="px-0.5 text-[13px] text-white/75">La consulta por WhatsApp todavía no está habilitada.</p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
