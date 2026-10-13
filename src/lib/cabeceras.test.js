import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Vitest corre desde la raíz del repo.
const leer = (archivo) => readFileSync(resolve(process.cwd(), archivo), 'utf8')

const vercel = JSON.parse(leer('vercel.json'))
const cabeceras = Object.fromEntries(vercel.headers[0].headers.map((h) => [h.key, h.value]))
const csp = cabeceras['Content-Security-Policy']

describe('cabeceras de seguridad (vercel.json)', () => {
  // La política solo deja correr el script del modo oscuro de index.html por su hash.
  // Si se edita ese script, hay que actualizar el hash en vercel.json.
  it('el hash de la CSP coincide con el script en línea de index.html', () => {
    const scripts = [...leer('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(scripts).toHaveLength(1)
    const hash = createHash('sha256').update(scripts[0]).digest('base64')
    expect(csp).toContain(`'sha256-${hash}'`)
  })

  it('no permite scripts en línea ni que otra página muestre la app dentro de un marco', () => {
    expect(csp.match(/script-src [^;]*/)[0]).not.toContain('unsafe')
    expect(csp).toContain("frame-ancestors 'none'")
  })
})
