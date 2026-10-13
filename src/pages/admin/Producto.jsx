import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useAuth } from '../../auth/contexto.js'
import EstadoStock from '../../components/EstadoStock.jsx'
import ListaMovimientos from '../../components/ListaMovimientos.jsx'
import { COLUMNAS_MOVIMIENTO, marcarRevertidos } from '../../lib/consultasMovimientos.js'
import { calcularEstado } from '../../lib/estado.js'
import { formatearCantidad, formatearPrecio } from '../../lib/formato.js'
import { borrarFoto, MAX_FOTOS, subirFoto, urlFoto } from '../../lib/fotos.js'
import {
  aFilaProducto,
  aFormulario,
  FORMULARIO_VACIO,
  mensajeError,
  stockInicial,
  UNIDADES,
  unidadPara,
  validarProducto,
} from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

const campo = 'campo'
const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })

function Campo({ etiqueta, error, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="etiqueta">{etiqueta}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-sin-stock">{error}</span>}
    </label>
  )
}

function Formulario({ inicial, producto, marcas, categorias, editable, alGuardar }) {
  const nuevo = !producto
  const [f, setF] = useState(inicial)
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function guardar(e) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    const errs = validarProducto(f, { nuevo })
    setErrores(errs)
    if (Object.keys(errs).length) return

    setGuardando(true)
    const fila = aFilaProducto(f)
    const consulta = nuevo
      ? supabase.from('products').insert(fila)
      : supabase.from('products').update(fila).eq('id', producto.id)
    const { data, error } = await consulta.select('id').single()
    if (error) {
      setGuardando(false)
      return setError(mensajeError(error))
    }

    let avisoInicial = null
    if (nuevo && stockInicial(f) > 0) {
      const mov = await supabase.rpc('registrar_movimiento', {
        p_product_id: data.id,
        p_type: 'stock_inicial',
        p_quantity: stockInicial(f),
      })
      if (mov.error) avisoInicial = `El producto se creó, pero no se pudo cargar el stock inicial: ${mensajeError(mov.error)}`
    }
    setGuardando(false)
    if (!nuevo) setAviso('Cambios guardados.')
    alGuardar(data.id, avisoInicial)
  }

  return (
    <form onSubmit={guardar} noValidate className="tarjeta">
      <fieldset disabled={!editable || guardando} className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Código (SKU)" error={errores.sku}>
          <input className={`${campo} font-mono`} value={f.sku} onChange={set('sku')} autoCapitalize="characters" />
        </Campo>
        <Campo etiqueta="Nombre" error={errores.name}>
          <input className={campo} value={f.name} onChange={set('name')} />
        </Campo>
        <Campo etiqueta="Marca">
          <select className={campo} value={f.brand_id} onChange={set('brand_id')}>
            <option value="">Sin marca</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Modelo">
          <input className={`${campo} font-mono`} value={f.model} onChange={set('model')} />
        </Campo>
        <Campo etiqueta="Año" error={errores.year}>
          <input className={`${campo} font-mono`} inputMode="numeric" value={f.year} onChange={set('year')} />
        </Campo>
        <Campo etiqueta="Categoría">
          <select className={campo} value={f.category_id} onChange={set('category_id')}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Descripción" className="sm:col-span-2">
          <textarea className={campo} rows={3} value={f.description} onChange={set('description')} />
        </Campo>
        <Campo etiqueta="Unidad de medida">
          <select className={campo} value={f.unit} onChange={set('unit')}>
            {Object.entries(UNIDADES).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Stock mínimo" error={errores.min_stock}>
          <input className={campo} inputMode="decimal" value={f.min_stock} onChange={set('min_stock')} />
        </Campo>
        <Campo etiqueta="Precio de venta ($)" error={errores.price}>
          <input className={campo} inputMode="decimal" value={f.price} onChange={set('price')} />
        </Campo>
        <Campo etiqueta="Costo ($, no se publica)" error={errores.cost}>
          <input className={campo} inputMode="decimal" value={f.cost} onChange={set('cost')} />
        </Campo>
        {nuevo && (
          <Campo etiqueta="Stock inicial" error={errores.stock_inicial}>
            <input className={campo} inputMode="decimal" value={f.stock_inicial} onChange={set('stock_inicial')} placeholder="0" />
          </Campo>
        )}
        <div className="flex flex-col gap-2 text-[13px] sm:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-activo" checked={f.active} onChange={set('active')} />
            <span>Activo <span className="text-suave">(un producto inactivo no admite movimientos ni se publica)</span></span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-activo" checked={f.visible} onChange={set('visible')} />
            Visible en el catálogo
          </label>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-[13px] text-sin-stock">{error}</p>}
      {aviso && <p className="mt-3 text-[13px] text-disponible">{aviso}</p>}
      {editable && (
        <button type="submit" disabled={guardando} className="btn-accion mt-4">
          {guardando ? 'Guardando…' : nuevo ? 'Crear producto' : 'Guardar cambios'}
        </button>
      )}
    </form>
  )
}

function Fotos({ productoId, fotos, editable, alCambiar }) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState(null)

  async function agregar(e) {
    const archivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length)
    e.target.value = ''
    if (!archivos.length) return
    setSubiendo(true)
    setError(null)
    let orden = fotos.reduce((max, f) => Math.max(max, f.sort_order), -1)
    try {
      for (const archivo of archivos) await subirFoto(productoId, archivo, ++orden)
    } catch (err) {
      setError(mensajeError(err))
    }
    setSubiendo(false)
    alCambiar()
  }

  async function quitar(foto) {
    if (!window.confirm('¿Borrar esta foto?')) return
    setError(null)
    try {
      await borrarFoto(foto)
    } catch (err) {
      setError(mensajeError(err))
    }
    alCambiar()
  }

  return (
    <section className="tarjeta">
      <h2 className="subtitulo">Fotos <span className="text-[13px] font-normal text-suave">({fotos.length} de {MAX_FOTOS})</span></h2>
      {fotos.length === 0 && <p className="mt-2 text-[13px] text-suave">Sin fotos.</p>}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {fotos.map((foto, i) => (
          <li key={foto.id} className="relative">
            <img
              src={urlFoto(foto.storage_path)}
              alt={`Foto ${i + 1}`}
              className={`aspect-square w-full rounded-md border-2 bg-foto object-cover ${i === 0 ? 'border-tinta' : 'border-transparent'}`}
            />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-full border border-linea bg-superficie px-1.5 py-px text-[11px] font-semibold text-tinta">
                Principal
              </span>
            )}
            {editable && (
              <button type="button" onClick={() => quitar(foto)} className="mt-1 text-[13px] font-semibold text-sin-stock hover:underline">
                Borrar
              </button>
            )}
          </li>
        ))}
      </ul>
      {editable && fotos.length < MAX_FOTOS && (
        <label className="btn-secundario mt-3 cursor-pointer">
          {subiendo ? 'Subiendo…' : 'Agregar fotos'}
          <input type="file" accept="image/*" multiple className="sr-only" disabled={subiendo} onChange={agregar} />
        </label>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] text-sin-stock">{error}</p>}
    </section>
  )
}

function HistorialPrecios({ cambios, nombres }) {
  return (
    <section className="tarjeta">
      <h2 className="subtitulo">Historial de precios</h2>
      {cambios.length === 0 ? (
        <p className="mt-2 text-[13px] text-suave">El precio no cambió desde que se cargó el producto.</p>
      ) : (
        <ul className="mt-1.5 divide-y divide-linea text-[13px]">
          {cambios.map((c) => (
            <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="tabular-nums">
                {formatearPrecio(c.old_price)} → <strong className="text-tinta">{formatearPrecio(c.new_price)}</strong>
              </span>
              <span className="text-[11px] text-suave">
                {fecha.format(new Date(c.created_at))}
                {nombres[c.user_id] && ` · ${nombres[c.user_id]}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function Producto() {
  const { id } = useParams()
  const nuevo = id === undefined
  const { perfil } = useAuth()
  const esAdmin = perfil?.role === 'admin'
  const navegar = useNavigate()
  const { state } = useLocation()

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const recargar = () => setVersion((v) => v + 1)

  useEffect(() => {
    let vigente = true
    const consultas = [
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('categories').select('id, name').order('name'),
    ]
    if (!nuevo) {
      consultas.push(
        supabase.from('products').select('*').eq('id', id).maybeSingle(),
        supabase.from('product_photos').select('id, storage_path, sort_order').eq('product_id', id).order('sort_order'),
        supabase.from('price_changes').select('id, old_price, new_price, user_id, created_at').eq('product_id', id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, name'),
        supabase.from('stock_movements').select(COLUMNAS_MOVIMIENTO).eq('product_id', id).order('created_at', { ascending: false }).limit(20),
      )
    }
    Promise.all(consultas).then(async ([marcas, categorias, producto, fotos, precios, perfiles, movimientos]) => {
      if (!vigente) return
      if ([marcas, categorias, producto, fotos, precios, movimientos].some((r) => r?.error)) {
        return setError('No se pudo cargar el producto.')
      }
      if (!nuevo && !producto.data) return setError('Ese producto no existe.')
      const conMarca = movimientos ? await marcarRevertidos(movimientos.data) : []
      if (!vigente) return
      setDatos({
        marcas: marcas.data,
        categorias: categorias.data,
        producto: producto?.data ?? null,
        fotos: fotos?.data ?? [],
        precios: precios?.data ?? [],
        movimientos: conMarca,
        nombres: Object.fromEntries((perfiles?.data ?? []).map((p) => [p.id, p.name])),
      })
    })
    return () => {
      vigente = false
    }
  }, [id, nuevo, version])

  function alGuardar(productoId, aviso) {
    if (nuevo) navegar(`/admin/productos/${productoId}`, { state: { aviso } })
    else recargar()
  }

  const p = datos?.producto
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Link to="/admin/productos" className="btn-volver"><span aria-hidden="true">←</span> Productos</Link>
      <h1 className="titulo">{nuevo ? 'Nuevo producto' : (p?.name ?? 'Producto')}</h1>
      {error && <p className="text-sin-stock">{error}</p>}
      {!error && !datos && <p className="text-suave">Cargando…</p>}
      {state?.aviso && <p role="alert" className="text-[13px] text-ultimas">{state.aviso}</p>}

      {p && (
        <div className="tarjeta flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <span className="text-[13px] text-suave">Stock actual</span>
          <span className="text-2xl font-semibold text-tinta tabular-nums">
            {formatearCantidad(p.stock)} <span className="text-sm font-medium text-suave">{unidadPara(p.unit, p.stock)}</span>
          </span>
          <EstadoStock estado={calcularEstado(p.stock, p.min_stock)} />
          {p.active ? (
            <Link to={`/admin/movimientos/nuevo?producto=${p.id}`} className="btn-accion ml-auto py-2">
              Registrar movimiento
            </Link>
          ) : (
            <span className="text-[13px] text-suave">Producto inactivo: no admite movimientos.</span>
          )}
        </div>
      )}

      {datos && (
        <Formulario
          key={p ? p.id : 'nuevo'}
          inicial={p ? aFormulario(p) : FORMULARIO_VACIO}
          producto={p}
          marcas={datos.marcas}
          categorias={datos.categorias}
          editable={esAdmin}
          alGuardar={alGuardar}
        />
      )}
      {p && <Fotos productoId={p.id} fotos={datos.fotos} editable={esAdmin} alCambiar={recargar} />}
      {p && (
        <section className="tarjeta">
          <div className="flex items-baseline justify-between">
            <h2 className="subtitulo">Últimos movimientos</h2>
            <Link to="/admin/movimientos" className="enlace text-[13px]">Ver historial</Link>
          </div>
          <div className="mt-1">
            <ListaMovimientos
              movimientos={datos.movimientos}
              nombres={datos.nombres}
              mostrarProducto={false}
              alCambiar={recargar}
              vacio="Este producto todavía no tiene movimientos."
            />
          </div>
        </section>
      )}
      {p && <HistorialPrecios cambios={datos.precios} nombres={datos.nombres} />}
    </div>
  )
}
