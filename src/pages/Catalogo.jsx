import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCarrito } from '../carrito/contexto.js'
import BarraCarrito from '../components/BarraCarrito.jsx'
import Encabezado from '../components/Encabezado.jsx'
import EstadoStock from '../components/EstadoStock.jsx'
import { useEstadosEnVivo } from '../hooks/useEstadosEnVivo.js'
import { escribirFiltros, filtrarCatalogo, fotoPrincipal, leerFiltros, opcionesDe } from '../lib/catalogo.js'
import { formatearCantidad, formatearPrecio } from '../lib/formato.js'
import { urlFoto } from '../lib/fotos.js'
import { UNIDADES } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'

const ficha = 'rounded-full border border-linea bg-superficie px-3 py-1.5 text-[13px] text-texto'

function BotonAgregar({ p }) {
  const { items, agregar } = useCarrito()
  const enCarrito = items.find((i) => i.productId === p.id)
  const base = 'mt-2 w-full rounded-md border py-1.5 text-[13px] font-semibold'
  if (p.status === 'sin_stock') {
    return (
      <button type="button" disabled className={`${base} border-linea text-suave`}>
        Sin stock
      </button>
    )
  }
  // Suma de a una unidad (o un metro, kilo, etc.); la cantidad exacta se ajusta en el carrito.
  return (
    <button
      type="button"
      onClick={() => agregar(p.id, 1)}
      aria-label={enCarrito ? `Agregar otro ${p.name} (en el carrito: ${formatearCantidad(enCarrito.cantidad)})` : `Agregar ${p.name} al carrito`}
      className={`${base} border-accion text-accion hover:bg-accion-suave ${enCarrito ? 'bg-accion-suave' : ''}`}
    >
      {enCarrito ? `En el carrito · ${formatearCantidad(enCarrito.cantidad)}` : '+ Agregar'}
    </button>
  )
}

function Tarjeta({ p, foto }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-lg border border-linea bg-superficie">
      <Link to={`/producto/${p.id}`} className="flex flex-1 flex-col">
        <div className="aspect-[4/3] bg-foto">
          {foto ? (
            <img src={urlFoto(foto)} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] text-suave">Sin foto</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 px-2.5 pt-2">
          <p className="text-[14px] leading-tight font-semibold">{p.name}</p>
          <p className="font-mono text-[11px] text-suave">{[p.brand_name, p.model, p.year].filter(Boolean).join(' · ')}</p>
          <div className="mt-auto flex flex-col gap-0.5 pt-2">
            <span className="text-[17px] font-semibold whitespace-nowrap text-tinta tabular-nums">
              {formatearPrecio(p.price)}
              {p.unit !== 'unidad' && <span className="text-[13px] font-normal text-suave"> / {UNIDADES[p.unit]?.toLowerCase()}</span>}
            </span>
            <EstadoStock estado={p.status} />
          </div>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5">
        <BotonAgregar p={p} />
      </div>
    </li>
  )
}

export default function Catalogo() {
  const [parametros, setParametros] = useSearchParams()
  // Los filtros viven en el estado y se copian a la dirección. Leerlos directo de la
  // dirección hace que la búsqueda pierda letras al escribir rápido, porque la
  // navegación se aplica después de la tecla.
  const [filtros, setFiltros] = useState(() => leerFiltros(parametros))
  const [productos, setProductos] = useState(null)
  const [fotos, setFotos] = useState({})
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase
        .from('catalogo_publico')
        .select('id, sku, name, brand_id, brand_name, model, year, category_id, category_name, unit, price, status')
        .order('name'),
      supabase.from('product_photos').select('product_id, storage_path, sort_order'),
    ]).then(([catalogo, imagenes]) => {
      if (!vigente) return
      if (catalogo.error) return setError('No se pudo cargar el catálogo. Probá recargar la página.')
      setError(null)
      setProductos(catalogo.data)
      setFotos(fotoPrincipal(imagenes.data ?? []))
    })
    return () => {
      vigente = false
    }
  }, [version])

  const alCambiar = useCallback((id, estado) => {
    setProductos((lista) => lista?.map((p) => (p.id === id ? { ...p, status: estado } : p)) ?? lista)
  }, [])
  useEstadosEnVivo({ alCambiar, alReconectar: () => setVersion((v) => v + 1) })

  const aplicar = (nuevos) => {
    setFiltros(nuevos)
    setParametros(escribirFiltros(nuevos), { replace: true })
  }
  const cambiar = (k, valor) => aplicar({ ...filtros, [k]: valor })
  const lista = productos ? filtrarCatalogo(productos, filtros) : []
  const marcas = productos ? opcionesDe(productos, 'brand_id', 'brand_name') : []
  const categorias = productos ? opcionesDe(productos, 'category_id', 'category_name') : []
  const hayFiltros = filtros.texto || filtros.marca || filtros.categoria || filtros.soloDisponibles

  const detalle = productos?.length ? `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'}` : null

  return (
    <>
      <Encabezado detalle={detalle} />
      <main className="mx-auto max-w-5xl px-3 pt-3 pb-28 sm:px-4">
        <h1 className="sr-only">Catálogo</h1>
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar producto, marca o modelo"
          className="w-full rounded-lg border border-linea bg-superficie px-3 py-2.5 text-texto placeholder:text-suave sm:max-w-md"
          value={filtros.texto}
          onChange={(e) => cambiar('texto', e.target.value)}
        />
        <div className="my-3 flex flex-wrap items-center gap-1.5">
          {marcas.length > 0 && (
            <select aria-label="Marca" className={`${ficha} ${filtros.marca ? 'border-activo bg-activo text-white' : ''}`} value={filtros.marca} onChange={(e) => cambiar('marca', e.target.value)}>
              <option value="">Marca</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          )}
          {categorias.length > 0 && (
            <select aria-label="Categoría" className={`${ficha} ${filtros.categoria ? 'border-activo bg-activo text-white' : ''}`} value={filtros.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
              <option value="">Categoría</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          <label className={`${ficha} flex cursor-pointer items-center gap-2 ${filtros.soloDisponibles ? 'border-activo bg-activo text-white' : ''}`}>
            <input type="checkbox" className="accent-accion" checked={filtros.soloDisponibles} onChange={(e) => cambiar('soloDisponibles', e.target.checked)} />
            Solo disponibles
          </label>
          {hayFiltros && (
            <button type="button" className="px-2 text-[13px] text-tinta underline" onClick={() => aplicar(leerFiltros(new URLSearchParams()))}>
              Limpiar
            </button>
          )}
        </div>

        {error && <p className="text-sin-stock">{error}</p>}
        {!error && productos === null && <p className="text-suave">Cargando…</p>}
        {productos?.length === 0 && <p className="text-suave">Todavía no hay productos publicados.</p>}
        {productos?.length > 0 && lista.length === 0 && <p className="text-suave">Ningún producto coincide con la búsqueda.</p>}
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {lista.map((p) => <Tarjeta key={p.id} p={p} foto={fotos[p.id]} />)}
        </ul>
      </main>
      <BarraCarrito />
    </>
  )
}
