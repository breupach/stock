import { createContext, useContext } from 'react'

export const CarritoContext = createContext({ items: [], agregar() {}, cambiar() {}, quitar() {}, vaciar() {} })

export const useCarrito = () => useContext(CarritoContext)
