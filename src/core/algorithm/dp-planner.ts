import { construirGrafo, type PensumGraph } from '../pensum/graph'
import { calcularNiveles } from '../pensum/validator'
import {
  DEFAULT_PLANNER_CONFIG,
  type Advertencia,
  type Asignatura,
  type BloqueoInfo,
  type FiltroMateria,
  type MapaEstadoEfectivo,
  type MateriaPlanificada,
  type PlannerInput,
  type Prioridad,
  type RutaCompleta,
  type SemestrePlan,
} from '../pensum/types'
import { detectarCuellosBotella, calcularLongitudesCadena } from './bottleneck'
import { calcularEstadoEfectivo, calcularHabilitadas, quedanPendientes } from './estado'
import { construirMateriaPlanificada, generarMensajeBloqueo, type ContextoRazon } from './explanations'

/**
 * Motor de ruta sugerida (modo normal). Construye la ruta semestre a semestre
 * de forma voraz. Ver DOCS/ESPECIFICACION-TECNICA.md §16.
 */
export function planificar(input: PlannerInput): RutaCompleta {
  const config = { ...DEFAULT_PLANNER_CONFIG, ...(input.config ?? {}) }
  const graph = construirGrafo(input.pensum)
  const { niveles, hayCiclo, nodosEnCiclo } = calcularNiveles(graph)

  if (hayCiclo) {
    return rutaVacia({
      codigos: nodosEnCiclo,
      razon_texto: `El pensum tiene un ciclo de prerrequisitos: ${nodosEnCiclo.join(', ')}`,
    })
  }

  const longitudesCadena = calcularLongitudesCadena(graph)
  const estado = calcularEstadoEfectivo(input.historial)
  const estadoInicial = new Map(estado)
  const filtros = input.filtros
  const perfil = input.perfil

  const creditosMax = perfil.creditos_maximos ?? config.creditos_max_default
  const creditosMin = perfil.creditos_minimos ?? 0

  let habilitadasBase = calcularHabilitadas(graph, estado)
  const semestres: SemestrePlan[] = []
  let semestre = 1

  while (semestre <= config.max_semestres) {
    const habilitadas = aplicarFiltros(habilitadasBase, filtros, semestre)
    const siSiEsteSemestre = new Set(
      filtros
        .filter((f) => f.tipo === 'si_o_si' && f.semestre_aplica === semestre)
        .map((f) => f.codigo),
    )

    const ctx: ContextoRazon = {
      graph,
      estado,
      siSiEsteSemestre,
      longitudesCadena,
    }

    const ordenadas = ordenarPorPrioridad(
      habilitadas,
      graph,
      perfil.prioridad,
      longitudesCadena,
    )

    const capEfectivo = capParaPrioridad(perfil.prioridad, creditosMax, creditosMin)
    const seleccionadas = seleccionarSemestre(
      ordenadas,
      capEfectivo,
      graph,
      siSiEsteSemestre,
    )

    if (seleccionadas.length === 0) break

    const materias = seleccionadas
      .map((codigo) => construirMateriaPlanificada(codigo, ctx))
      .filter((m): m is MateriaPlanificada => m !== null)

    semestres.push({
      numero: semestre,
      materias,
      total_creditos: materias.reduce((s, m) => s + m.creditos, 0),
    })

    for (const codigo of seleccionadas) estado.set(codigo, 'aprobada')
    habilitadasBase = calcularHabilitadas(graph, estado)

    if (quedanPendientes(graph, estado).length === 0) break
    semestre++
  }

  const pendientesFinales = quedanPendientes(graph, estado)
  const bloqueo = pendientesFinales.length > 0
    ? construirBloqueo(graph, estado, pendientesFinales)
    : null

  const cuellos = detectarCuellosBotella(graph, estadoInicial, niveles)
  const advertencias = generarAdvertencias(input, semestres)

  return {
    semestres,
    total_semestres: semestres.length,
    proximas_materias: semestres[0]?.materias ?? [],
    cuellos_botella: cuellos,
    advertencias,
    llega_a_objetivo:
      perfil.semestre_objetivo !== undefined
        ? semestres.length <= perfil.semestre_objetivo
        : undefined,
    bloqueo,
  }
}

// ──────────────────────────── Helpers ────────────────────────────

function rutaVacia(bloqueo: BloqueoInfo): RutaCompleta {
  return {
    semestres: [],
    total_semestres: 0,
    proximas_materias: [],
    cuellos_botella: [],
    advertencias: [],
    bloqueo,
  }
}

function aplicarFiltros(
  habilitadas: Set<string>,
  filtros: FiltroMateria[],
  semestre: number,
): Set<string> {
  const resultado = new Set(habilitadas)
  for (const f of filtros) {
    if (f.tipo === 'evitar' && f.semestre_aplica === semestre) {
      resultado.delete(f.codigo)
    }
  }
  return resultado
}

function capParaPrioridad(
  prioridad: Prioridad,
  creditosMax: number,
  creditosMin: number,
): number {
  if (prioridad === 'comodo') {
    const objetivo = Math.floor(creditosMax * 0.7)
    return Math.max(creditosMin, objetivo)
  }
  return creditosMax
}

function ordenarPorPrioridad(
  habilitadas: Set<string>,
  graph: PensumGraph,
  prioridad: Prioridad,
  longitudesCadena: Map<string, number>,
): string[] {
  const lista = [...habilitadas]

  if (prioridad === 'rapido') {
    lista.sort((a, b) => {
      const la = longitudesCadena.get(a) ?? 1
      const lb = longitudesCadena.get(b) ?? 1
      if (lb !== la) return lb - la
      const da = (graph.reverseAdj.get(a) ?? []).length
      const db = (graph.reverseAdj.get(b) ?? []).length
      if (db !== da) return db - da
      return a.localeCompare(b)
    })
    return lista
  }

  // 'promedio' y 'comodo': menos créditos primero.
  lista.sort((a, b) => {
    const ca = graph.asignaturas.get(a)?.creditos ?? 0
    const cb = graph.asignaturas.get(b)?.creditos ?? 0
    if (ca !== cb) return ca - cb
    return a.localeCompare(b)
  })
  return lista
}

function seleccionarSemestre(
  ordenadas: string[],
  creditosMax: number,
  graph: PensumGraph,
  siSi: Set<string>,
): string[] {
  const seleccionadas: string[] = []
  let creditos = 0

  const creditosDe = (codigo: string): number =>
    graph.asignaturas.get(codigo)?.creditos ?? 0

  // Primero las "sí o sí" que quepan.
  for (const codigo of siSi) {
    if (!graph.asignaturas.has(codigo)) continue
    const c = creditosDe(codigo)
    if (creditos + c <= creditosMax) {
      seleccionadas.push(codigo)
      creditos += c
    }
  }

  // Luego el resto en orden de prioridad.
  for (const codigo of ordenadas) {
    if (seleccionadas.includes(codigo)) continue
    const c = creditosDe(codigo)
    if (creditos + c <= creditosMax) {
      seleccionadas.push(codigo)
      creditos += c
    }
  }

  return seleccionadas
}

function construirBloqueo(
  graph: PensumGraph,
  estado: MapaEstadoEfectivo,
  pendientes: string[],
): BloqueoInfo {
  const pendientesOrdenados = pendientes
    .map((c) => graph.asignaturas.get(c))
    .filter((a): a is Asignatura => a !== undefined)
    .sort((a, b) => a.creditos - b.creditos)

  const primero = pendientesOrdenados[0]
  const razon = primero
    ? generarMensajeBloqueo(primero.codigo, graph, estado)
    : 'No se pudieron planificar todas las materias.'

  return {
    codigos: pendientes,
    razon_texto: razon,
  }
}

function generarAdvertencias(
  input: PlannerInput,
  semestres: SemestrePlan[],
): Advertencia[] {
  const advertencias: Advertencia[] = []

  // Mínimo de 10 créditos por periodo (UNAL).
  const primerSemestre = semestres[0]
  if (primerSemestre && primerSemestre.total_creditos < 10) {
    advertencias.push({
      tipo: 'creditos_minimos_unal',
      mensaje:
        'La UNAL exige mínimo 10 créditos por periodo (salvo autorización del Consejo de Facultad).',
      valor: primerSemestre.total_creditos,
    })
  }

  // Materias "en curso" de periodos antiguos.
  const enCurso = input.historial.filter((h) => h.estado === 'en_curso')
  const periodos = enCurso
    .map((h) => h.periodo)
    .filter((p): p is string => typeof p === 'string')
  if (periodos.length > 0) {
    const maxPeriodo = periodos.reduce((a, b) => (a > b ? a : b))
    const antiguos = enCurso
      .filter((h) => h.periodo !== undefined && h.periodo < maxPeriodo)
      .map((h) => h.codigo)
    if (antiguos.length > 0) {
      advertencias.push({
        tipo: 'en_curso_antiguo',
        codigos: [...new Set(antiguos)],
      })
    }
  }

  return advertencias
}