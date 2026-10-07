import { memo } from 'react'
import { CheckCircle } from 'lucide-react'
import { GRUPOS_SIA } from '../core/algorithm/cupos'
import type { AvanceComponente, FilaResumenSIA } from '../core/pensum/types'

interface ProgressPanelProps {
  avance: AvanceComponente[]
  /** Bloque "Resumen de créditos" importado del SIA (vacío si no se importó). */
  resumenSia: FilaResumenSIA[]
}

function FilaAvance({ c }: { c: AvanceComponente }) {
  const usados = c.creditos_aprobados + c.creditos_inscritos
  const pct = c.creditos_exigidos > 0
    ? Math.min(100, Math.round((usados / c.creditos_exigidos) * 100))
    : 100
  return (
    <div>
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
}

/**
 * Avance del estudiante por tipología.
 *
 * - Si se importó el "Resumen de créditos" del SIA, muestra esa tabla tal
 *   cual (valores al momento de importar).
 * - Debajo muestra el avance calculado con el pensum, agrupado bajo las
 *   mismas tipologías y en el mismo orden del SIA (GRUPOS_SIA), con el
 *   nombre del pensum como sub-fila. Es el cálculo que usa el motor para
 *   decidir los cupos de las recomendaciones.
 */
export const ProgressPanel = memo(function ProgressPanel({ avance, resumenSia }: ProgressPanelProps) {
  if (avance.length === 0 && resumenSia.length === 0) return null

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      {resumenSia.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">Resumen de créditos (SIA)</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              Importado del SIA — al momento de importar
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-1.5 pr-2 font-medium">Tipologías</th>
                  <th className="py-1.5 px-2 font-medium text-right">Exigidos</th>
                  <th className="py-1.5 px-2 font-medium text-right">Aprobados</th>
                  <th className="py-1.5 px-2 font-medium text-right">Pendientes</th>
                  <th className="py-1.5 px-2 font-medium text-right">Inscritos</th>
                  <th className="py-1.5 pl-2 font-medium text-right">Cursados</th>
                </tr>
              </thead>
              <tbody>
                {resumenSia.map((f, idx) => {
                  const esTotal = f.tipologia.toUpperCase().startsWith('TOTAL')
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 ${esTotal ? 'bg-gray-50 font-semibold text-gray-700' : 'text-gray-700'}`}
                    >
                      <td className="py-1.5 pr-2">{f.tipologia}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums">{f.exigidos}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-green-700">{f.aprobados}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-orange-700">{f.pendientes}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-blue-700">{f.inscritos}</td>
                      <td className="py-1.5 pl-2 text-right tabular-nums text-gray-500">{f.cursados}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">
            Cursados = créditos ya vistos (no necesariamente aprobados). Si editas el
            historial a mano, estos valores quedan como estaban al importar;
            re-importa para actualizarlos.
          </p>
        </div>
      )}

      {avance.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-800">Avance por tipología</h3>
            <span className="text-xs text-gray-500">
              {resumenSia.length > 0
                ? 'Calculado con el pensum (el motor usa estos cupos)'
                : 'según tu historial'}
            </span>
          </div>

          <div className="space-y-3">
            {GRUPOS_SIA.map((grupo) => {
              const filas = grupo.componentes
                .map((comp) => avance.find((a) => a.componente === comp))
                .filter((a): a is AvanceComponente => Boolean(a))
              if (filas.length === 0) return null
              const exigidosGrupo = filas.reduce((s, f) => s + f.creditos_exigidos, 0)
              return (
                <div key={grupo.etiqueta} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-baseline justify-between flex-wrap gap-1 mb-2">
                    <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                      {grupo.etiqueta}
                    </h4>
                    <span className="text-xs text-gray-400 tabular-nums">
                      pensum: {exigidosGrupo} cr exigidos
                    </span>
                  </div>
                  <div className="space-y-3">
                    {filas.map((c) => (
                      <FilaAvance key={c.componente} c={c} />
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-gray-500">
              Nivelación no cuenta para la graduación (no aparece en el cálculo).
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Los códigos fuera del pensum y los excedentes cuentan como libre elección.
            Marca tus cursos inscritos en el historial para que sumen aquí.
          </p>
        </div>
      )}
    </section>
  )
})
