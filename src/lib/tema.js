// Tema de las pantallas públicas. Sin elección guardada, sigue al celular o la computadora.
const CLAVE = 'stock.tema'

export function leerTema(almacen = globalThis.localStorage) {
  try {
    const t = almacen?.getItem(CLAVE)
    return t === 'oscuro' || t === 'claro' ? t : null
  } catch {
    return null
  }
}

export function guardarTema(tema, almacen = globalThis.localStorage) {
  try {
    almacen?.setItem(CLAVE, tema)
  } catch {
    // Navegación privada: el tema vale hasta cerrar la pestaña.
  }
}

export const prefiereOscuro = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

export function temaInicial(almacen = globalThis.localStorage, sistemaOscuro = prefiereOscuro()) {
  const t = leerTema(almacen)
  return t ? t === 'oscuro' : sistemaOscuro
}
