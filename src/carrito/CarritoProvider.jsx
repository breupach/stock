import { useEffect, useMemo, useState } from 'react'
import { agregarItem, cambiarCantidad, guardarCarrito, leerCarrito, quitarItem } from '../lib/carrito.js'
import { CarritoContext } from './contexto.js'

export default function CarritoProvider({ children }) {
  const [items, setItems] = useState(() => leerCarrito())

  useEffect(() => guardarCarrito(items), [items])

  // Si el cliente tiene el catálogo abierto en otra pestaña, ambas ven el mismo carrito.
  useEffect(() => {
    const alCambiar = (e) => {
      if (e.key === 'stock.carrito') setItems(leerCarrito())
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  const valor = useMemo(
    () => ({
      items,
      agregar: (id, cantidad) => setItems((it) => agregarItem(it, id, cantidad)),
      cambiar: (id, cantidad) => setItems((it) => cambiarCantidad(it, id, cantidad)),
      quitar: (id) => setItems((it) => quitarItem(it, id)),
      vaciar: () => setItems([]),
    }),
    [items],
  )
  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>
}
