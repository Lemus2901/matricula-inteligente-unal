import { useState } from 'react'
import { Search, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import type { Pensum, Asignatura, EstadoEfectivo, EstadoMateria } from '../core/pensum/types'

interface HistoryEditorProps {
  pensum: Pensum
  historial: Record<string, EstadoEfectivo>
  onChange: (codigo: string, estado: EstadoMateria) => void
}

export function HistoryEditor({ pensum, historial, onChange }: HistoryEditorProps) {
  const [filtroTexto, setFiltroTexto] = useState('')

  const asignaturas = [...pensum.asignaturas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre)
  )

  const filtradas = asignaturas.filter(
    (a) =>
      a.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      a.codigo.toLowerCase().includes(filtroTexto.toLowerCase())
  )

  const grouped = filtradas.reduce((acc, a) => {
    const key = a.agrupacion
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {} as Record<string, Asignatura[]>)

  const componentNames: Record<string, string> = {
    fundamentacion: 'Fundamentación',
    ciencias_computacion: 'Ciencias de la Computación',
    ingenieria_software: 'Ingeniería de Software',
    sistemas: 'Sistemas',
    proyectos_ingenieria: 'Proyectos en Ingeniería',
    optativas_tecnologicas: 'Optativas de Tecnologías',
    trabajo_grado: 'Trabajo de Grado',
    libre_eleccion: 'Libre Elección',
  }

  const estadoActual = (codigo: string) => historial[codigo] ?? 'no_vista'

  const toggle = (codigo: string) => {
    const actual = estadoActual(codigo)
    let siguiente: 'aprobada' | 'perdida' | 'en_curso' = 'aprobada'
    if (actual === 'aprobada') siguiente = 'perdida'
    else if (actual === 'perdida') siguiente = 'en_curso'
    else if (actual === 'en_curso') siguiente = 'aprobada'
    onChange(codigo, siguiente)
  }

  const getBadge = (estado: EstadoEfectivo) => {
    switch (estado) {
      case 'aprobada':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Aprobada</span>
      case 'en_curso':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">⏳ En curso</span>
      case 'perdida':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Perdida</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"><MinusCircle className="w-3 h-3 mr-1" /> No vista</span>
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          placeholder="Buscar asignatura..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div className="space-y-3 max-h-[400px] overflow-auto">
        {Object.entries(grouped).map(([comp, items]) => (
          <details key={comp} className="group">
            <summary className="flex items-center justify-between p-2 bg-gray-50 rounded-lg cursor-pointer">
              <span className="font-medium text-gray-700">{componentNames[comp] ?? comp}</span>
              <span className="text-sm text-gray-500">{items.length} materias</span>
            </summary>
            <div className="mt-2 space-y-1 pl-4 border-l border-gray-200">
              {items.map((a) => {
                const estado = estadoActual(a.codigo)
                return (
                  <label
                    key={a.codigo}
                    onClick={() => toggle(a.codigo)}
                    className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-sm text-gray-500 w-16">{a.codigo}</span>
                      <span className="text-sm text-gray-700 flex-1">{a.nombre} ({a.creditos} cr.)</span>
                    </div>
                    {getBadge(estado)}
                  </label>
                )}
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}