export default function FaltaConfiguracion() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Falta configurar Supabase</h1>
      <p className="mt-3 text-stone-600">
        Definí <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en{' '}
        <code>.env.local</code> (desarrollo) o en las variables del proyecto en Vercel.
      </p>
    </main>
  )
}
