import { ChevronDown, FileText, X } from 'lucide-react'
import { memo, useState } from 'react'

interface SemesterPlanViewProps {
  ruta: any
  onClose: () => void
}

export const SemesterPlanView = memo(function SemesterPlanView({ ruta, onClose }: SemesterPlanViewProps) {
  const [expandido, setExpandido] = useState<Record<number, boolean>>({})

  if (!ruta || !ruta.semestres.length) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Ruta por semestre</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
          </div>
          <p className="text-gray-500">No hay ruta calculada.</p>
        </div>
      </div>
    )
  }

  const exportarTexto = () => {
    let texto = `Ruta de matrícula — ${ruta.total_semestres} semestres\n\n`
    ruta.semestres.forEach((s: any) => {
      texto += `\n=== Semestre ${s.numero} (${s.total_creditos} créditos) ===\n`
      s.materias.forEach((m: any) => {
        texto += `  - ${m.codigo} ${m.nombre} (${m.creditos} cr.) — ${m.razon_texto}\n`
      })
    })
    if (ruta.cuellos_botella.length) {
      texto += '\nCuellos de botella:\n'
      ruta.cuellos_botella.forEach((c: any) => {
        texto += `  - ${c.codigo} ${c.nombre} (cadena ${c.cadena_longitud}, cuesta ${c.costo_si_evita} sem si evita)\n`
      })
    }
    navigator.clipboard.writeText(texto)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-h-[80vh] overflow-auto max-w-2xl w-full mx-4 max-h-[90vh]">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Ruta por semestre — {ruta.total_semestres} semestres</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportarTexto} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
              <FileText className="w-4 h-4 mr-1" /> Copiar texto
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {ruta.llega_a_objetivo !== undefined && (
            <div className={`p-3 rounded-lg ${ruta.llega_a_objetivo ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
              <div className="flex items-center gap-2">
                {ruta.llega_a_objetivo ? (
                  <>
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    </span>
                    <span className="font-medium">Llegas a tu objetivo en {ruta.total_semestres} semestres</span>
                  </>
                ) : (
                  <>
                    <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10.586 10l-3.293 3.293a1 1 0 001.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586 6.707 5.293a1 1 0 00-1.414 1.414z" clipRule="evenodd"/></svg>
                    </span>
                    <span className="font-medium">No llegas a tu objetivo (ruta: {ruta.total_semestres} semestres)</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {ruta.semestres.map((s: any) => {
              const key = s.numero
              const isOpen = expandido[key]
              return (
                <details key={key} className="border border-gray-200 rounded-lg overflow-hidden" open={isOpen}>
                  <summary
                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandido(prev => ({ ...prev, [key]: !prev[key] }))}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        {s.numero}
                      </span>
                      <div>
                        <span className="font-semibold text-gray-800">Semestre {s.numero}</span>
                        <span className="ml-2 text-sm text-gray-500">{s.total_creditos} créditos</span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                  </summary>
                  <div className="p-4 space-y-2">
                    {s.materias.map((m: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg">
                        <span className="font-mono text-sm text-gray-500 w-14">{m.codigo}</span>
                        <span className="text-gray-700 flex-1">{m.nombre} ({m.creditos} cr.)</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{m.creditos} cr.</span>
                        <span className="text-xs text-gray-500 px-2 py-0.5 rounded bg-gray-50">{m.razon_texto}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-100 text-sm text-gray-500">
                      Total: {s.total_creditos} créditos
                    </div>
                  </div>
                </details>
              )
            })}
          </div>

          {ruta.cuellos_botella.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                </span>
                <span>Cuellos de botella detectados</span>
              </h3>
              <div className="space-y-2 mt-2">
                {ruta.cuellos_botella.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-800">{c.codigo} - {c.nombre}</span>
                        <span className="ml-2 text-sm text-gray-500">Cadena: {c.cadena_longitud} | Semestre actual: {c.semestre_actual}</span>
                      </div>
                      <span className="text-sm text-orange-700 font-medium">
                        Evitar cuesta ~{c.costo_si_evita} semestres
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})