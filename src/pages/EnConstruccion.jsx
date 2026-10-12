import Encabezado from '../components/Encabezado.jsx'

export default function EnConstruccion({ titulo }) {
  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-stone-500">Esta pantalla llega en una próxima etapa.</p>
      </main>
    </>
  )
}
