import { Settings, AlertTriangle, Info } from 'lucide-react'

interface AdvancedSettingsProps {
  onConfigChange: (config: any) => void
  currentConfig: any
}

export function AdvancedSettings({ onConfigChange, currentConfig }: AdvancedSettingsProps) {
  return (
    <details className="group">
      <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Configuración avanzada</span>
        </div>
        <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </summary>

      <div className="p-4 space-y-4 border-t border-gray-100 bg-white rounded-b-lg">
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              Estas opciones afectan el comportamiento del motor de recomendación.
              La mayoría de usuarios no necesitan modificarlas.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeout del modo exacto (A*) — segundos
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={currentConfig.astarTimeout ?? 3}
              onChange={(e) => onConfigChange({ ...currentConfig, astarTimeout: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Tiempo máximo que el algoritmo exacto busca una ruta mejor. 3s por defecto.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semestres máximos a explorar
            </label>
            <input
              type="number"
              min="5"
              max="30"
              value={currentConfig.maxSemestres ?? 15}
              onChange={(e) => onConfigChange({ maxSemestres: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Límite superior de semestres que el algoritmo explora antes de rendirse.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Modo exacto (A*)</p>
              <p>El modo exacto busca la ruta óptima absoluta. Está desactivado por defecto en v0.1 y se activará en v1.0.</p>
            </div>
          </div>
        </div>
      </div>
    </details>
  )
}