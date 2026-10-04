import { useState } from 'react'
import { PlusCircle, Filter, Target, Trash2, Clock, Zap, Battery } from 'lucide-react'

interface FilterPanelProps {
  pensum: any
  filtros: any[]
  onFiltrosChange: (filtros: any[]) => void
  perfil: any
  onPerfilChange: (parcial: any) => void
}

export function FilterPanel({ pensum, filtros, onFiltrosChange, perfil, onPerfilChange }: FilterPanelProps) {
  const [evitarInput, setEvitarInput] = useState('')
  const [sisiInput, setSisiInput] = useState('')

  const agregarFiltro = (tipo: 'evitar' | 'si_o_si', codigo: string) => {
    if (!codigo) return
    onFiltrosChange([...filtros.filter(f => f.codigo !== codigo || f.tipo !== tipo), { codigo, tipo, semestre_aplica: 1 }])
  }

  const remover = (codigo: string, tipo: 'evitar' | 'si_o_si') => {
    onFiltrosChange(filtros.filter(f => f.codigo !== codigo || f.tipo !== tipo))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filtros por materia
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evitar (no este semestre)</label>
              <div className="flex gap-2">
                <select
                  value={evitarInput}
                  onChange={(e) => setEvitarInput(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {pensum?.asignaturas?.map((a: any) => (
                    <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={() => agregarFiltro('evitar', evitarInput)}
                  disabled={!evitarInput}
                  className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sí o sí (forzar inclusión)</label>
              <div className="flex gap-2">
                <select
                  value={sisiInput}
                  onChange={(e) => setSisiInput(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {pensum?.asignaturas?.map((a: any) => (
                    <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={() => agregarFiltro('si_o_si', sisiInput)}
                  disabled={!sisiInput}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          {filtros.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {filtros.map((f) => (
                <div key={`${f.codigo}-${f.tipo}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      f.tipo === 'evitar' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {f.tipo === 'evitar' ? 'Evitar' : 'Sí o sí'}
                    </span>{' '}
                    <span className="font-mono ml-2">{f.codigo}</span>
                  </span>
                  <button
                    onClick={() => remover(f.codigo, f.tipo)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" /> Prioridad
          </h3>
          <div className="space-y-2">
            {['rapido', 'promedio', 'comodo'].map((p) => (
              <label key={p} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                perfil.prioridad === p
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}>
                <input
                  type="radio"
                  name="prioridad"
                  value={p}
                  checked={perfil.prioridad === p}
                  onChange={() => onPerfilChange({ prioridad: p as any })}
                  className="text-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">
                      {p === 'rapido' && <Zap className="w-4 h-4" />}
                      {p === 'promedio' && <Battery className="w-4 h-4" />}
                      {p === 'comodo' && <Clock className="w-4 h-4" />}
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    {p === 'rapido' && 'Termina lo antes posible (ruta crítica)'}
                    {p === 'promedio' && 'Carga ligera para cuidar el promedio'}
                    {p === 'comodo' && 'Equilibrio entre velocidad y carga'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Créditos mínimos por semestre</label>
          <input
            type="number"
            min="10"
            max="30"
            value={perfil.creditos_minimos ?? ''}
            onChange={(e) => onPerfilChange({ creditos_minimos: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Sin mínimo"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Créditos máximos por semestre</label>
          <input
            type="number"
            min="10"
            max="30"
            value={perfil.creditos_maximos ?? ''}
            onChange={(e) => onPerfilChange({ creditos_maximos: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Sin máximo"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-1">Semestre objetivo de graduación</label>
          <input
            type="number"
            min="1"
            max="20"
            value={perfil.semestre_objetivo ?? ''}
            onChange={(e) => onPerfilChange({ semestre_objetivo: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Opcional"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>
    </div>
  )
}