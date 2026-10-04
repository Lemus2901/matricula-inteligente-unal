import { Zap, AlertTriangle, CheckCircle, AlertCircle, Target } from 'lucide-react'
import type { MateriaPlanificada, CuelloBotella } from '../core/pensum/types'

interface NextCoursesListProps {
  proximas: MateriaPlanificada[]
  filtros: any[]
  cuellos: CuelloBotella[]
  advertencias: any[]
  onSimularPerdida: (codigo: string) => void
  onToggleFiltro: (codigo: string, tipo: 'evitar' | 'si_o_si') => void
}

export function NextCoursesList({ proximas, filtros, cuellos, advertencias, onSimularPerdida, onToggleFiltro }: NextCoursesListProps) {
  if (!proximas || proximas.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
        <div className="text-gray-500">
          <p className="text-lg font-medium mb-2">No hay materias habilitadas</p>
          <p className="text-sm">Completa tu historial o ajusta los filtros para ver recomendaciones.</p>
        </div>
      </div>
    )
  }

  const getRazonIcon = (razon: string) => {
    switch (razon) {
      case 'cuello_botella': return <span title="Cuello de botella"><Zap className="w-4 h-4 text-orange-500" /></span>
      case 'filtro_si_o_si': return <span title="Forzado (sí o sí)"><CheckCircle className="w-4 h-4 text-green-500" /></span>
      case 'desbloquea_otras': return <span title="Desbloquea otras materias"><Target className="w-4 h-4 text-blue-500" /></span>
      case 'obligatoria_plan': return <span title="Obligatoria por plan"><CheckCircle className="w-4 h-4 text-gray-500" /></span>
      case 'prerrequisito_cumplido': return <span title="Prerrequisitos cumplidos"><CheckCircle className="w-4 h-4 text-gray-400" /></span>
      case 'optativa_tecnologica': return <span className="text-purple-500">◆</span>
      case 'libre_eleccion': return <span className="text-gray-400">◈</span>
      default: return null
    }
  }

  const getRazonTexto = (razon: string) => {
    const map: Record<string, string> = {
      cuello_botella: 'Cuello de botella',
      filtro_si_o_si: 'Forzado (sí o sí)',
      desbloquea_otras: 'Desbloquea otras materias',
      relleno_creditos: 'Relleno de créditos',
      obligatoria_plan: 'Obligatoria por plan',
      prerrequisito_cumplido: 'Prerrequisitos cumplidos',
      optativa_tecnologica: 'Optativa de tecnologías',
      libre_eleccion: 'Libre elección',
    }
    return map[razon] ?? razon
  }

  const isEvitar = (codigo: string) => filtros.some(f => f.tipo === 'evitar' && f.codigo === codigo)
  const isSiSi = (codigo: string) => filtros.some(f => f.tipo === 'si_o_si' && f.codigo === codigo)

  const renderMateria = (m: MateriaPlanificada, idx: number) => {
    const esEvitar = isEvitar(m.codigo)
    const esSiSi = isSiSi(m.codigo)
    const esCuello = cuellos.some(c => c.codigo === m.codigo)

    return (
      <div
        key={idx}
        className={`flex items-center gap-3 p-3 rounded-lg border ${
          esEvitar ? 'bg-orange-50 border-orange-200' :
          esSiSi ? 'bg-green-50 border-green-200' :
          esCuello ? 'bg-orange-50 border-orange-200' :
          'bg-white border-gray-200'
        } hover:shadow-sm transition-shadow`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-mono text-sm text-gray-500 w-14">{m.codigo}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 truncate">{m.nombre}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{m.creditos} créditos</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {m.alias ? `(${m.alias})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1 text-gray-600">
                {getRazonIcon(m.razon)}
                <span>{getRazonTexto(m.razon)}</span>
              </span>
              {m.razon_texto && (
                <span className="text-gray-400">— {m.razon_texto}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFiltro(m.codigo, 'evitar')}
            className={`p-1.5 rounded text-xs font-medium transition-colors ${
              isEvitar(m.codigo) ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'
            }`}
            title="Evitar este semestre"
          >
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Evitar</span>
          </button>
          <button
            onClick={() => onToggleFiltro(m.codigo, 'si_o_si')}
            className={`p-1.5 rounded text-xs font-medium transition-colors ${
              isSiSi(m.codigo) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-green-50'
            }`}
            title="Forzar (sí o sí)"
          >
            <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sí o sí</span>
          </button>
          <button
            onClick={() => onSimularPerdida(m.codigo)}
            className="p-1.5 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
            title="Simular pérdida"
          >
            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> ¿Y si pierdo?</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-600" />
          </span>
          Próximas materias a matricular ({proximas.length})
        </h2>
        <div className="space-y-2">
          {proximas.map(renderMateria)}
        </div>

        {advertencias.length > 0 && (
          <div className="space-y-2 mt-4">
            {advertencias.map((adv, idx) => (
              <div key={idx} className="p-3 rounded-lg border-l-4 bg-yellow-50 border-yellow-400 text-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{adv.mensaje ?? adv.tipo}</p>
                    {adv.valor !== undefined && <p className="text-sm text-yellow-700 mt-1">Valor actual: {adv.valor}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}