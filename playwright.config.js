import { defineConfig, devices } from '@playwright/test'
import { URL_SUPABASE } from './e2e/falsoSupabase.js'

// Pruebas de punta a punta contra un Supabase falso (ver e2e/falsoSupabase.js).
// Corren en computadora y en un celular simulado. No forman parte del build de
// Vercel: se corren a mano con `npm run test:e2e`.
const PUERTO = 5180

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.js',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PUERTO}`, locale: 'es-AR' },
  projects: [
    { name: 'computadora', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npx vite --port ${PUERTO} --strictPort`,
    port: PUERTO,
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: URL_SUPABASE, VITE_SUPABASE_ANON_KEY: 'clave-falsa' },
  },
})
