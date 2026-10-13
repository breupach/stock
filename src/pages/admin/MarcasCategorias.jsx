import { useEffect, useState } from 'react'
import { mensajeError } from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

function Fila({ item, tabla, alCambiar }) {
  const [nombre, setNombre] = useState(item.name)
  const [error, setError] = useState(null)
  const cambiado = nombre.trim() !== item.name

  async function guardar(e) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from(tabla).update({ name: nombre.trim() }).eq('id', item.id)
    if (error) setError(mensajeError(error))
    else alCambiar()
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar "${item.name}"?`)) return
    setError(null)
    const { error } = await supabase.from(tabla).delete().eq('id', item.id)
    if (error) setError(mensajeError(error))
    else alCambiar()
  }

  return (
    <li className="py-2">
      <form onSubmit={guardar} className="flex items-center gap-2">
        <input
          aria-label="Nombre"
          className="campo mt-0 min-w-0 flex-1 py-1.5"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        {cambiado && (
          <button type="submit" className="btn-accion py-1.5">
            Guardar
          </button>
        )}
        <button type="button" onClick={borrar} className="btn-secundario">
          Borrar
        </button>
      </form>
      {error && <p role="alert" className="mt-1 text-[13px] text-sin-stock">{error}</p>}
    </li>
  )
}

function Lista({ titulo, tabla, singular }) {
  const [items, setItems] = useState(null)
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const recargar = () => setVersion((v) => v + 1)

  useEffect(() => {
    let vigente = true
    supabase
      .from(tabla)
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (vigente) setItems(data ?? [])
      })
    return () => {
      vigente = false
    }
  }, [tabla, version])

  async function agregar(e) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from(tabla).insert({ name: nuevo.trim() })
    if (error) return setError(mensajeError(error))
    setNuevo('')
    recargar()
  }

  return (
    <section className="tarjeta">
      <h2 className="subtitulo">{titulo}</h2>
      <form onSubmit={agregar} className="mt-3 flex gap-2">
        <input
          aria-label={`Nueva ${singular}`}
          placeholder={`Nueva ${singular}`}
          className="campo mt-0 min-w-0 flex-1"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          required
        />
        <button type="submit" className="btn-accion">
          Agregar
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-[13px] text-sin-stock">{error}</p>}
      {items === null ? (
        <p className="mt-3 text-suave">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-suave">Todavía no hay ninguna.</p>
      ) : (
        <ul className="mt-2 divide-y divide-linea">
          {items.map((it) => (
            <Fila key={`${it.id}-${it.name}`} item={it} tabla={tabla} alCambiar={recargar} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default function MarcasCategorias() {
  return (
    <div className="max-w-4xl space-y-4 md:space-y-6">
      <h1 className="titulo">Marcas y categorías</h1>
      <div className="grid items-start gap-4 md:grid-cols-2 md:gap-6">
        <Lista titulo="Marcas" tabla="brands" singular="marca" />
        <Lista titulo="Categorías" tabla="categories" singular="categoría" />
      </div>
    </div>
  )
}
