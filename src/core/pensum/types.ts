/**
 * Tipos del dominio — Matrícula Inteligente UNAL (v0.1)
 *
 * Ver DOCS/ESPECIFICACION-TECNICA.md §13.
 */

// ═══════════════ PENSUM ═══════════════

export type ComponenteId =
  | 'fundamentacion'
  | 'ciencias_computacion'
  | 'ingenieria_software'
  | 'sistemas'
  | 'proyectos_ingenieria'
  | 'optativas_tecnologicas'
  | 'trabajo_grado'
  | 'libre_eleccion'

export interface RequisitoPorcentaje {
  componente: ComponenteId
  porcentaje: number
}

export interface Asignatura {
  codigo: string
  nombre: string
  alias?: string | null
  creditos: number
  obligatoria: boolean
  semestre_en_plan?: number | null
  prerrequisitos: string[]
  agrupacion: ComponenteId
  requisito_porcentaje?: RequisitoPorcentaje | RequisitoPorcentaje[] | null
  verificado: boolean
  fuente_ref: string
}

export interface ComponenteInfo {
  creditos_exigidos: number
  creditos_obligatorios: number
}

export interface Pensum {
  pensum_id: string
  programa: string
  facultad: string
  sede: string
  creditos_totales: number
  asignaturas: Asignatura[]
  componentes: Record<ComponenteId, ComponenteInfo>
}

// ═══════════════ PERFIL ═══════════════

export type Prioridad = 'rapido' | 'promedio' | 'comodo'

export interface PerfilEstudiante {
  pensum_id: string
  creditos_minimos?: number
  creditos_maximos?: number
  prioridad: Prioridad
  semestre_objetivo?: number
  cupo_consumido_inicial?: number
}

// ═══════════════ HISTORIAL ═══════════════

export type EstadoMateria = 'aprobada' | 'perdida' | 'en_curso'

export interface HistorialItem {
  codigo: string
  estado: EstadoMateria
  periodo?: string
  nota?: number
  creditos_inscritos?: number
  cancelada_antes_segunda_semana?: boolean
}

export type HistorialAcademico = HistorialItem[]

// ═══════════════ FILTROS ═══════════════

export type TipoFiltro = 'evitar' | 'si_o_si'

export interface FiltroMateria {
  codigo: string
  tipo: TipoFiltro
  semestre_aplica: number
}

// ═══════════════ RESULTADO ═══════════════

export type RazonCodigo =
  | 'cuello_botella'
  | 'filtro_si_o_si'
  | 'desbloquea_otras'
  | 'relleno_creditos'
  | 'obligatoria_plan'
  | 'prerrequisito_cumplido'
  | 'optativa_tecnologica'
  | 'libre_eleccion'

export interface MateriaPlanificada {
  codigo: string
  nombre: string
  alias?: string | null
  creditos: number
  razon: RazonCodigo
  razon_texto: string
}

export interface SemestrePlan {
  numero: number
  materias: MateriaPlanificada[]
  total_creditos: number
}

export interface CuelloBotella {
  codigo: string
  nombre: string
  alias?: string | null
  cadena_longitud: number
  semestre_actual: number
  costo_si_evita: number
}

export type Advertencia =
  | { tipo: 'creditos_minimos_unal'; mensaje: string; valor: number }
  | { tipo: 'en_curso_antiguo'; codigos: string[] }
  | { tipo: 'cupo_proyectado_v02'; mensaje: string }
  | { tipo: 'papa_proyectado_v02'; mensaje: string }

export interface RutaCompleta {
  semestres: SemestrePlan[]
  total_semestres: number
  proximas_materias: MateriaPlanificada[]
  cuellos_botella: CuelloBotella[]
  advertencias: Advertencia[]
  llega_a_objetivo?: boolean
  bloqueo?: BloqueoInfo | null
}

export interface BloqueoInfo {
  codigos: string[]
  razon_texto: string
}

// ═══════════════ ENTRADA DEL MOTOR ═══════════════

export interface PlannerInput {
  pensum: Pensum
  historial: HistorialAcademico
  filtros: FiltroMateria[]
  perfil: PerfilEstudiante
  config?: PlannerConfig
}

export interface PlannerConfig {
  max_semestres: number
  creditos_max_default: number
}

export const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  max_semestres: 15,
  creditos_max_default: 20,
}

// ═══════════════ PARSER SIA ═══════════════

export interface ParseError {
  linea: string
  mensaje: string
}

export interface ParseResult {
  items: HistorialItem[]
  errores: ParseError[]
  warnings: string[]
}

// ═══════════════ ESTADO EFECTIVO ═══════════════

export type EstadoEfectivo = EstadoMateria | 'no_vista'

export type MapaEstadoEfectivo = Map<string, EstadoEfectivo>