import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import Encabezado from '../components/Encabezado.jsx'
import EstadoStock from '../components/EstadoStock.jsx'
import { useEstadosEnVivo } from '../hooks/useEstadosEnVivo.js'
import { escribirFiltros, filtrarCatalogo, fotoPrincipal, leerFiltros, opcionesDe } from '../lib/catalogo.js'
import { formatearPrecio } from '../lib/formato.js'
import { urlFoto } from '../lib/fotos.js'
import { UNIDADES } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'

const campo = 'rounded-md border border-stone-300 bg-white px-3 py-2'

function Tarjeta({ p, foto }) {
  return (
    <li>
      <Link to={`/producto/${p.id}`} className="flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white hover:border-stone-300">
        <div className="aspect-[4/3] bg-stone-100">
          {foto ? (
            <img src={urlFoto(foto)} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-400">Sin foto</div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3">
          <p className="font-medium">{p.name}</p>
          <p className="text-sm text-stone-500">{[p.brand_name, p.model, p.year].filter(Boolean).join(' · ')}</p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            <span className="font-semibold">
              {formatearPrecio(p.price)}
              {p.unit !== 'unidad' && <span className="text-sm font-normal text-stone-500"> / {UNIDADES[p.unit]?.toLowerCase()}</span>}
            </span>
            <EstadoStock estado={p.status} />
          </div>
        </div>
      </Link>
    </li>
  )
}

export default function Catalogo() {
  const [parametros, setParametros] = useSearchParams()
  const filtros = leerFiltros(parametros)
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

  const cambiar = (k, valor) => setParametros(escribirFiltros({ ...filtros, [k]: valor }), { replace: true })
  const lista = productos ? filtrarCatalogo(productos, filtros) : []
  const marcas = productos ? opcionesDe(productos, 'brand_id', 'brand_name') : []
  const categorias = productos ? opcionesDe(productos, 'category_id', 'category_name') : []
  const hayFiltros = filtros.texto || filtros.marca || filtros.categoria || filtros.soloDisponibles

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="sr-only">Catálogo</h1>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <input
            type="search"
            aria-label="Buscar"
            placeholder="Buscar producto, marca o modelo"
            className={`${campo} w-full sm:w-72`}
            value={filtros.texto}
            onChange={(e) => cambiar('texto', e.target.value)}
          />
          {marcas.length > 0 && (
            <select aria-label="Marca" className={campo} value={filtros.marca} onChange={(e) => cambiar('marca', e.target.value)}>
              <option value="">Todas las marcas</option>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          )}
          {categorias.length > 0 && (
            <select aria-label="Categoría" className={campo} value={filtros.categoria} onChange={(e) => cambiar('categoria', e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={filtros.soloDisponibles} onChange={(e) => cambiar('soloDisponibles', e.target.checked)} />
            Solo disponibles
          </label>
          {hayFiltros && (
            <button type="button" className="text-sm text-marca underline" onClick={() => setParametros({}, { replace: true })}>
              Limpiar
            </button>
          )}
        </div>

        {error && <p className="text-sin-stock">{error}</p>}
        {!error && productos === null && <p className="text-stone-500">Cargando…</p>}
        {productos?.length === 0 && <p className="text-stone-500">Todavía no hay productos publicados.</p>}
        {productos?.length > 0 && lista.length === 0 && <p className="text-stone-500">Ningún producto coincide con la búsqueda.</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {lista.map((p) => <Tarjeta key={p.id} p={p} foto={fotos[p.id]} />)}
        </ul>
      </main>
    </>
  )
}
