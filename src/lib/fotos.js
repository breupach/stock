import { supabase } from './supabase.js'

export const MAX_FOTOS = 5
export const LADO_MAXIMO = 1200
const BUCKET = 'fotos'

// Medidas finales para que el lado más largo no pase de `maximo`, sin agrandar.
export function medidasReducidas(ancho, alto, maximo = LADO_MAXIMO) {
  const escala = Math.min(1, maximo / Math.max(ancho, alto))
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

// Reduce la imagen a 1200 px y la pasa a WebP en el navegador, antes de subirla.
export async function reducirImagen(archivo) {
  const imagen = await createImageBitmap(archivo)
  const { ancho, alto } = medidasReducidas(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  lienzo.getContext('2d').drawImage(imagen, 0, 0, ancho, alto)
  imagen.close()
  const blob = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/webp', 0.85))
  if (!blob) throw new Error('No se pudo procesar la imagen.')
  return blob
}

export const urlFoto = (ruta) => supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl

export async function subirFoto(productoId, archivo, orden) {
  const blob = await reducirImagen(archivo)
  const ruta = `productos/${productoId}/${crypto.randomUUID()}.webp`
  const subida = await supabase.storage.from(BUCKET).upload(ruta, blob, { contentType: 'image/webp' })
  if (subida.error) throw subida.error
  const { error } = await supabase
    .from('product_photos')
    .insert({ product_id: productoId, storage_path: ruta, sort_order: orden })
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta])
    throw error
  }
}

export async function borrarFoto(foto) {
  const { error } = await supabase.from('product_photos').delete().eq('id', foto.id)
  if (error) throw error
  // Si falla el borrado del archivo queda huérfano en Storage, pero ya no se muestra.
  await supabase.storage.from(BUCKET).remove([foto.storage_path])
}
