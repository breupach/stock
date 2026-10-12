import { Link } from 'react-router'

export default function Encabezado() {
  return (
    <header className="bg-marca text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold">
          Stock
        </Link>
        <Link to="/admin" className="text-sm text-white/80 hover:text-white">
          Panel
        </Link>
      </div>
    </header>
  )
}
