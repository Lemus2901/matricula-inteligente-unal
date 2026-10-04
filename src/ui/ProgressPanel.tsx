import { CheckCircle } from 'lucide-react'
import type { AvanceComponente } from '../core/pensum/types'

interface ProgressPanelProps {
  avance: AvanceComponente[]
}

/**
 * Avance del estudiante por componente (tipología) del pensum,
 * en el mismo estilo del resumen del SIA (RF-22 / RN-10).
 */
export function ProgressPanel({ avance }: ProgressPanelProps) {
  if (avance.length === 0) return null

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Avance por tipología</h3>
        <span className="text-xs text-gray-500">según tu historial</span>
      </div>

      <div className="space-y-3">
        {avance.map((c) => {
          const usados = c.creditos_aprobados + c.creditos_inscritos
          const pct = c.creditos_exigidos > 0
            ? Math.min(100, Math.round((usados / c.creditos_exigidos) * 100))
            : 100
          return (
            <div key={c.componente}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 flex items-center gap-1.5">
                  {c.cumple && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                  {c.nombre}
                </span>
                <span className="tabular-nums text-gray-600">
                  <span className={c.cumple ? 'text-green-700 font-medium' : ''}>
                    {c.creditos_aprobados}
                  </span>
                  /{c.creditos_exigidos} cr
                  {c.creditos_inscritos > 0 && (
                    <span className="text-blue-600"> + {c.creditos_inscritos} inscritos</span>
                  )}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${c.cumple ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {c.excedente > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.excedente} cr excedente → cuenta para libre elección
                </p>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-500">
        Los códigos fuera del pensum y los excedentes cuentan como libre elección.
        Marca tus cursos inscritos en el historial para que sumen aquí.
      </p>
    </section>
  )
}
