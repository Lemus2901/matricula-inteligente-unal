import { useState } from 'react'
import type { CuelloBotella } from '../core/pensum/types'

interface BottleneckAlertProps {
  cuellos: CuelloBotella[]
}

export function BottleneckAlert({ cuellos }: BottleneckAlertProps) {
  const [expandido, setExpandido] = useState(false)

  if (!cuellos.length) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          </span>
          <span className="font-semibold text-orange-800">Cuellos de botella detectados</span>
        </div>
        <svg className={`w-5 h-5 text-orange-500 transition-transform ${expandido ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>

      {cuellos.length > 0 && (
        <details open={expandido} className="group">
          <summary className="p-3 cursor-pointer list-none">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-700 font-medium">{cuellos.length} detectados</span>
            </div>
          </summary>
          <div className="p-3 space-y-2 border-t border-orange-100">
            {cuellos.slice(0, 5).map((c, i) => (
              <div key={i} className="p-2 bg-white border border-orange-100 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm text-gray-500">{c.codigo}</span>
                    <span className="ml-2 font-medium text-gray-800">{c.nombre}</span>
                    <span className="ml-2 text-xs text-gray-500">Cadena: {c.cadena_longitud} · Sem {c.semestre_actual}</span>
                  </div>
                  <span className="text-sm font-medium text-orange-700">
                    Evitar cuesta ~{c.costo_si_evita} semestres
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}