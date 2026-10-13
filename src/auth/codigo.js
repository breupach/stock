// Código de seguridad (Google Authenticator). Solo los administradores lo usan.
// Devuelve qué le falta a la sesión para entrar al panel:
//   'codigo'  → tiene el código activado y todavía no lo ingresó en esta sesión
//   'activar' → es administrador y todavía no activó el código
//   null      → puede entrar
// `nivel` es lo que devuelve supabase.auth.mfa.getAuthenticatorAssuranceLevel().
export function pasoPendiente(perfil, nivel) {
  if (!perfil || nivel?.currentLevel === 'aal2') return null
  if (nivel?.nextLevel === 'aal2') return 'codigo'
  return perfil.role === 'admin' ? 'activar' : null
}

export const RUTA_PASO = { codigo: '/admin/codigo', activar: '/admin/activar-codigo' }

// "482913" o "482 913" → "482913"; cualquier otra cosa queda afuera.
export function limpiarCodigo(texto) {
  return String(texto ?? '').replace(/\D/g, '').slice(0, 6)
}

// Clave de texto en grupos de 4, más fácil de copiar a mano.
export function agruparClave(clave) {
  return String(clave ?? '').match(/.{1,4}/g)?.join(' ') ?? ''
}

// supabase-js entrega el QR como "data:image/svg+xml;utf-8,<svg…>" sin codificar,
// y un "#" dentro del SVG (un color, por ejemplo) corta la imagen. Se codifica.
const PREFIJO_QR = 'data:image/svg+xml;utf-8,'
export function imagenQr(qr) {
  const svg = String(qr ?? '')
  return svg.startsWith(PREFIJO_QR) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.slice(PREFIJO_QR.length))}` : svg
}
