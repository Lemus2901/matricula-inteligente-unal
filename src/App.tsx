import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, Download, Trash2 } from 'lucide-react'
import { usePlannerStore } from './store/usePlannerStore'
import { calcularEstadoEfectivo } from './core/algorithm/estado'
import type { EstadoEfectivo } from './core/pensum/types'
import { PensumSelector } from './ui/PensumSelector'
import { HistoryImport } from './ui/HistoryImport'
import { HistoryEditor } from './ui/HistoryEditor'
import { FilterPanel } from './ui/FilterPanel'
import { NextCoursesList } from './ui/NextCoursesList'
import { ProgressPanel } from './ui/ProgressPanel'
import { SemesterPlanView } from './ui/SemesterPlanView'
import { BottleneckAlert } from './ui/BottleneckAlert'
import { ConflictToast } from './ui/ConflictToast'
import { AdvancedSettings } from './ui/AdvancedSettings'

export function App() {
  const {
    pensum,
    pensumLoading,
    pensumError,
    perfil,
    historial,
    filtros,
    ruta,
    recalculando,
    error,
    cargarPensum,
    setPerfil,
    setHistorial,
    setFiltros,
    recalcular,
    exportar,
    limpiarTodo,
  } = usePlannerStore()

  const [mostrarRutaCompleta, setMostrarRutaCompleta] = useState(false)
  const [conflicto, setConflicto] = useState<{ mensaje: string; tipo: 'error' | 'warning' } | null>(null)
  const [configAvanzada, setConfigAvanzada] = useState({ astarTimeout: 3, maxSemestres: 15 })

  useEffect(() => {
    cargarPensum()
  }, [cargarPensum])

  const handleImportar = useCallback((items: any[]) => {
    setHistorial(items)
    recalcular()
    setConflicto({ mensaje: `${items.length} asignaturas importadas correctamente.`, tipo: 'warning' })
  }, [setHistorial, recalcular])

  const handleSimular = useCallback((codigo: string) => {
    // Simular pérdida: temporalmente marcar como perdida y recalcular
    const historialActual = usePlannerStore.getState().historial
    const nuevoHistorial = historialActual.map((h: any) =>
      h.codigo === codigo ? { ...h, estado: 'perdida' as const } : h
    )
    setHistorial(nuevoHistorial)
    recalcular()
    setConflicto({ mensaje: `Simulación: ${codigo} marcada como perdida.`, tipo: 'warning' })
  }, [setHistorial, recalcular])

  const handleToggleFiltro = useCallback((codigo: string, tipo: 'evitar' | 'si_o_si') => {
    const filtrosActuales = usePlannerStore.getState().filtros
    const existe = filtrosActuales.some(f => f.codigo === codigo && f.tipo === tipo)

    if (existe) {
      setFiltros(filtrosActuales.filter(f => f.codigo !== codigo || f.tipo !== tipo))
      return
    }

    const { pensum, historial: historialActual, perfil } = usePlannerStore.getState()
    if (!pensum) return

    let conflictoMsg = ''

    if (tipo === 'si_o_si') {
      const asignatura = pensum.asignaturas.find(a => a.codigo === codigo)
      const estadoEfectivo = (cod: string) => {
        const h = historialActual.find((h: any) => h.codigo === cod)
        return h?.estado ?? 'no_vista'
      }
      if (asignatura && asignatura.prerrequisitos.some(p => estadoEfectivo(p) !== 'aprobada')) {
        conflictoMsg = `No puedes forzar ${codigo}: te faltan prerrequisitos (${asignatura.prerrequisitos.filter(p => estadoEfectivo(p) !== 'aprobada').join(', ')})`
      }
    }

    if (!conflictoMsg && perfil.creditos_maximos) {
      const creditosActuales = 0 // calcular créditos del semestre 1
      const nuevaMateria = pensum.asignaturas.find(a => a.codigo === codigo)
      if (nuevaMateria && creditosActuales + nuevaMateria.creditos > (perfil.creditos_maximos || 20)) {
        conflictoMsg = `${codigo} (${nuevaMateria.creditos} cr.) excedería el máximo de ${perfil.creditos_maximos} créditos.`
      }
    }

    if (conflictoMsg) {
      setConflicto({ mensaje: conflictoMsg, tipo: 'error' })
      return
    }

    setFiltros([...filtrosActuales.filter(f => f.codigo !== codigo || f.tipo !== tipo), { codigo, tipo, semestre_aplica: 1 }])
  }, [setFiltros])

  const handleExportar = () => {
    const json = exportar()
    navigator.clipboard.writeText(json)
    alert('Ruta exportada al portapapeles (JSON)')
  }

  const handleLimpiar = () => {
    if (confirm('¿Borrar todo el historial, filtros y perfil?')) {
      limpiarTodo()
    }
  }

  // Estado efectivo por código para HistoryEditor (resuelve duplicados: aprobada gana)
  const historialMap: Record<string, EstadoEfectivo> = Object.fromEntries(
    calcularEstadoEfectivo(historial),
  )

  if (pensumLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando pensum...</p>
        </div>
      </div>
    )
  }

  if (pensumError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Error al cargar el pensum</h2>
          </div>
          <p className="text-gray-600 mb-4">{pensumError}</p>
          <button
            onClick={cargarPensum}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!pensum) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Matrícula Inteligente UNAL</h1>
                <p className="text-xs text-gray-500">Facultad de Minas · Ingeniería de Sistemas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportar}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Exportar
              </button>
              <button
                onClick={handleLimpiar}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" /> Limpiar todo
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setConflicto(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {conflicto && (
          <ConflictToast conflict={conflicto} onDismiss={() => setConflicto(null)} />
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          <aside className="lg:col-span-1 space-y-6">
            <section>
              <PensumSelector
                pensums={[pensum]}
                selectedPensumId={pensum.pensum_id}
                onSelect={() => {}}
              />
            </section>

            <section>
              <h3 className="font-semibold text-gray-800 mb-3">Historial académico</h3>
              <div className="space-y-3">
                <HistoryImport onImport={handleImportar} />
                <HistoryEditor
                  pensum={pensum}
                  historial={historialMap}
                  onChange={(codigo, estado) => {
                    const idx = historial.findIndex(h => h.codigo === codigo)
                    if (idx >= 0) {
                      const nuevo = [...historial]
                      nuevo[idx] = { ...nuevo[idx], estado }
                      setHistorial(nuevo)
                    } else {
                      setHistorial([...historial, { codigo, estado, periodo: undefined }])
                    }
                    recalcular()
                  }}
                />
              </div>
            </section>

            <section>
              <FilterPanel
                pensum={pensum}
                filtros={filtros}
                onFiltrosChange={setFiltros}
                perfil={perfil}
                onPerfilChange={setPerfil}
              />
            </section>

            <section>
              <AdvancedSettings
                currentConfig={configAvanzada}
                onConfigChange={setConfigAvanzada}
              />
            </section>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            {recalculando && (
              <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Calculando ruta...</p>
              </div>
            )}

            {!recalculando && (
              <>
                <NextCoursesList
                  proximas={ruta?.proximas_materias ?? []}
                  filtros={filtros}
                  cuellos={ruta?.cuellos_botella ?? []}
                  advertencias={ruta?.advertencias ?? []}
                  onSimularPerdida={handleSimular}
                  onToggleFiltro={handleToggleFiltro}
                />

                <ProgressPanel avance={ruta?.avance ?? []} />

                <BottleneckAlert cuellos={ruta?.cuellos_botella ?? []} />

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Ruta completa por semestres</h3>
                  <button
                    onClick={() => setMostrarRutaCompleta(true)}
                    className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                  >
                    Ver completa ({ruta?.total_semestres ?? 0} semestres)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {mostrarRutaCompleta && (
        <SemesterPlanView
          ruta={ruta}
          onClose={() => setMostrarRutaCompleta(false)}
        />
      )}

      <ConflictToast conflict={conflicto} onDismiss={() => setConflicto(null)} />
    </div>
  )
}

export default App