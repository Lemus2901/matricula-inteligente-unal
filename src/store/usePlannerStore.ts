import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { planificarAsync } from '../app/plannerClient'
import { cargarPensum } from '../core/pensum/loader'
import type {
  PerfilEstudiante,
  HistorialItem,
  FiltroMateria,
  RutaCompleta,
  Pensum,
  ParseResult,
} from '../core/pensum/types'
import { cargarEstado, guardarEstado, limpiarEstado, perfilInicial, exportarJSON } from '../app/storage'
import { parsearHistorialSIA } from '../core/pensum/parser-sia'

interface PensumState {
  pensum: Pensum | null
  pensumLoading: boolean
  pensumError: string | null
  perfil: PerfilEstudiante
  historial: HistorialItem[]
  filtros: FiltroMateria[]
  ruta: RutaCompleta | null
  recalculando: boolean
  error: string | null

  // Acciones mutativas puras
  setPensum: (pensum: Pensum) => void
  setPensumLoading: (loading: boolean) => void
  setPensumError: (error: string | null) => void
  setPerfil: (parcial: Partial<PerfilEstudiante>) => void
  setHistorial: (historial: HistorialItem[]) => void
  setFiltros: (filtros: FiltroMateria[]) => void
  agregarFiltro: (filtro: FiltroMateria) => void
  removerFiltro: (codigo: string, tipo: 'evitar' | 'si_o_si') => void
  limpiarFiltros: () => void
  setRuta: (ruta: RutaCompleta | null) => void
  setRecalculando: (loading: boolean) => void
  setError: (error: string | null) => void

  // Acciones con efectos
  cargarPensum: () => Promise<void>
  importarHistorial: (texto: string) => ParseResult
  recalcular: () => Promise<void>
  exportar: () => string
  limpiarTodo: () => void
}

const DEFAULT_PLAN = 'sistemas-minas-2024'

export const usePlannerStore = create<PensumState>()(
  immer((set, get) => ({
    pensum: null,
    pensumLoading: false,
    pensumError: null,
    perfil: perfilInicial(DEFAULT_PLAN),
    historial: [],
    filtros: [],
    ruta: null,
    recalculando: false,
    error: null,

    // Mutaciones puras
    setPensum: (pensum) => set({ pensum, pensumLoading: false }),
    setPensumLoading: (loading) => set({ pensumLoading: loading }),
    setPensumError: (error) => set({ pensumError: error, pensumLoading: false }),
    setPerfil: (parcial) => set((state) => { state.perfil = { ...state.perfil, ...parcial } }),
    setHistorial: (historial) => set({ historial }),
    setFiltros: (filtros) => set({ filtros }),
    agregarFiltro: (filtro) =>
      set((state) => {
        state.filtros = [...state.filtros.filter(f => f.codigo !== filtro.codigo || f.tipo !== filtro.tipo), filtro]
      }),
    removerFiltro: (codigo, tipo) =>
      set((state) => {
        state.filtros = state.filtros.filter(f => f.codigo !== codigo || f.tipo !== tipo)
      }),
    limpiarFiltros: () => set({ filtros: [] }),
    setRuta: (ruta) => set({ ruta }),
    setRecalculando: (loading) => set({ recalculando: loading }),
    setError: (error) => set({ error }),

    // Acciones con efectos
    cargarPensum: async () => {
      set({ pensumLoading: true, pensumError: null })
      try {
        const res = await fetch('/data/pensum-sistemas-minas.json')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: unknown = await res.json()
        const carga = cargarPensum(data)
        if (!carga.ok || !carga.pensum) {
          throw new Error(`Pensum inválido: ${carga.errores.join('; ')}`)
        }
        set({ pensum: carga.pensum, pensumLoading: false })

        const guardado = cargarEstado()
        if (guardado && guardado.pensum_id === carga.pensum.pensum_id) {
          set({
            perfil: guardado.perfil,
            historial: guardado.historial,
            filtros: guardado.filtros,
          })
        }
        get().recalcular()
      } catch (e) {
        set({ pensumLoading: false, pensumError: String(e) })
      }
    },

    importarHistorial: (texto) => {
      const resultado = parsearHistorialSIA(texto)
      if (resultado.items.length > 0) {
        set({ historial: resultado.items })
        get().recalcular()
      }
      return resultado
    },

    recalcular: async () => {
      const { pensum, perfil, historial, filtros } = get()
      if (!pensum) return

      set({ recalculando: true, error: null })
      try {
        const input = { pensum, historial, filtros, perfil }
        const ruta = await planificarAsync(input)
        set({ ruta, recalculando: false, error: null })
      } catch (e) {
        set({ recalculando: false, error: String(e) })
      }
    },

    exportar: () => {
      const { pensum, perfil, historial, filtros } = get()
      if (!pensum) return ''
      return exportarJSON({
        schema_version: 1,
        pensum_id: pensum.pensum_id,
        perfil,
        historial,
        filtros,
      })
    },

    limpiarTodo: () => {
      limpiarEstado()
      set({
        perfil: perfilInicial('sistemas-minas-2024'),
        historial: [],
        filtros: [],
        ruta: null,
        error: null,
      })
    },
  })))

// Persistencia: guarda perfil, historial y filtros en localStorage en cada cambio.
usePlannerStore.subscribe((state, prev) => {
  if (!state.pensum) return
  if (
    state.perfil === prev.perfil &&
    state.historial === prev.historial &&
    state.filtros === prev.filtros
  ) {
    return
  }
  guardarEstado({
    schema_version: 1,
    pensum_id: state.pensum.pensum_id,
    perfil: state.perfil,
    historial: state.historial,
    filtros: state.filtros,
  })
})