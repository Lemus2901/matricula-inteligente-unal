import { construirGrafo, type PensumGraph } from '../pensum/graph'
import { calcularNiveles } from '../pensum/validator'
import {
  DEFAULT_PLANNER_CONFIG,
  type Advertencia,
  type Asignatura,
  type AvanceComponente,
  type BloqueoInfo,
  type ComponenteId,
  type FiltroMateria,
  type MapaEstadoEfectivo,
  type MateriaPlanificada,
  type PlannerInput,
  type Prioridad,
  type RutaCompleta,
  type SemestrePlan,
} from '../pensum/types'
import { detectarCuellosBotella, calcularLongitudesCadena } from './bottleneck'
import { calcularAvance, cumpleCupo, indexarAvance } from './cupos'
import { calcularEstadoEfectivo, calcularHabilitadas } from './estado'
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

  // Avance actual por componente (tipología) — cupos RF-22 / RN-10.
  const avanceInicial = calcularAvance(input.pensum, input.historial)
  const avancePorId = indexarAvance(avanceInicial)
  const planificados = new Map<ComponenteId, number>()
  const cupoOk = (comp: ComponenteId): boolean =>
    cumpleCupo(
      avancePorId.get(comp),
      planificados.get(comp) ?? 0,
    )

  const creditosMax = perfil.creditos_maximos ?? config.creditos_max_default
  const creditosMin = perfil.creditos_minimos ?? 0

  let habilitadasBase = calcularHabilitadas(graph, estado)
  const semestres: SemestrePlan[] = []
  let semestre = 1

  while (semestre <= config.max_semestres) {
    const filtradas = aplicarFiltros(habilitadasBase, filtros, semestre)
    // RF-22: fuera las no obligatorias de componentes cuyo cupo ya está cubierto
    // (aprobados + inscritos + planificados). Las obligatorias siempre entran.
    const habilitadas = new Set<string>()
    for (const codigo of filtradas) {
      const a = graph.asignaturas.get(codigo)
      if (!a) continue
      if (a.obligatoria || !cupoOk(a.agrupacion)) habilitadas.add(codigo)
    }

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
      avance: avancePorId,
      planificados,
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

    for (const codigo of seleccionadas) {
      estado.set(codigo, 'aprobada')
      const a = graph.asignaturas.get(codigo)
      if (a) {
        planificados.set(
          a.agrupacion,
          (planificados.get(a.agrupacion) ?? 0) + a.creditos,
        )
      }
    }
    habilitadasBase = calcularHabilitadas(graph, estado)

    // Criterio de terminación: todas las obligatorias aprobadas y los cupos
    // de todos los componentes cubiertos (la libre elección se llena fuera
    // del motor: códigos fuera del pensum o excedentes).
    if (!faltanRequeridas(graph, estado, avancePorId, planificados)) break
    semestre++
  }

  const obligatoriasPendientes = [...graph.asignaturas.values()]
    .filter((a) => a.obligatoria && (estado.get(a.codigo) ?? 'no_vista') !== 'aprobada')
    .map((a) => a.codigo)
  const bloqueo = obligatoriasPendientes.length > 0
    ? construirBloqueo(graph, estado, obligatoriasPendientes)
    : null

  const necesarias = calcularMateriasNecesarias(graph, avancePorId)
  const cuellos = detectarCuellosBotella(graph, estadoInicial, niveles, 5, necesarias)
  const advertencias = generarAdvertencias(
    input,
    semestres,
    avancePorId,
    planificados,
  )

  return {
    semestres,
    total_semestres: semestres.length,
    proximas_materias: semestres[0]?.materias ?? [],
    cuellos_botella: cuellos,
    advertencias,
    avance: avanceInicial,
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
    avance: [],
    bloqueo,
  }
}

/**
 * ¿Falta algo para graduarse? Obligatorias sin aprobar, o cupos de
 * componentes (excepto libre elección) sin cubrir. La libre elección se
 * excluye porque su excedente lo aportan otras materias o códigos fuera
 * del pensum, que el motor no agenda.
 */
function faltanRequeridas(
  graph: PensumGraph,
  estado: MapaEstadoEfectivo,
  avancePorId: Map<ComponenteId, AvanceComponente>,
  planificados: Map<ComponenteId, number>,
): boolean {
  for (const a of graph.asignaturas.values()) {
    if (a.obligatoria && (estado.get(a.codigo) ?? 'no_vista') !== 'aprobada') {
      return true
    }
  }
  for (const [id, av] of avancePorId) {
    if (id === 'libre_eleccion') continue
    if (!cumpleCupo(av, planificados.get(id) ?? 0)) return true
  }
  return false
}

/**
 * Materias necesarias para graduarse (para acotar los cuellos de botella):
 * las obligatorias y las no obligatorias de componentes con cupo pendiente,
 * más todos sus prerrequisitos (ancestros). Una optativa de un cupo ya
 * cumplido no es necesaria.
 */
function calcularMateriasNecesarias(
  graph: PensumGraph,
  avancePorId: Map<ComponenteId, AvanceComponente>,
): Set<string> {
  const necesarias = new Set<string>()

  const agregarConAncestros = (codigo: string) => {
    const pila = [codigo]
    while (pila.length > 0) {
      const actual = pila.pop()!
      if (necesarias.has(actual)) continue
      necesarias.add(actual)
      const a = graph.asignaturas.get(actual)
      if (a) pila.push(...a.prerrequisitos)
    }
  }

  for (const a of graph.asignaturas.values()) {
    const cupoPendiente =
      !a.obligatoria && !cumpleCupo(avancePorId.get(a.agrupacion), 0)
    if (a.obligatoria || cupoPendiente) agregarConAncestros(a.codigo)
  }

  return necesarias
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

  // Primero las obligatorias del plan (importan para los cupos y para
  // desbloquear); luego el resto según la prioridad del perfil.
  const esObligatoria = (c: string) => graph.asignaturas.get(c)?.obligatoria === true

  if (prioridad === 'rapido') {
    lista.sort((a, b) => {
      const oa = esObligatoria(a) ? 1 : 0
      const ob = esObligatoria(b) ? 1 : 0
      if (oa !== ob) return ob - oa
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

  // 'promedio' y 'comodo': obligatorias primero, menos créditos después.
  lista.sort((a, b) => {
    const oa = esObligatoria(a) ? 1 : 0
    const ob = esObligatoria(b) ? 1 : 0
    if (oa !== ob) return ob - oa
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
  avancePorId: Map<ComponenteId, AvanceComponente>,
  planificados: Map<ComponenteId, number>,
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

  // Cupos de componentes sin cubrir al terminar la ruta (excluye libre
  // elección, que se reporta aparte).
  const cuposPendientes: string[] = []
  for (const av of avancePorId.values()) {
    if (av.componente === 'libre_eleccion') continue
    const faltan = Math.max(
      0,
      av.creditos_exigidos -
        av.creditos_aprobados -
        av.creditos_inscritos -
        (planificados.get(av.componente) ?? 0),
    )
    if (faltan > 0) {
      cuposPendientes.push(`${av.nombre}: faltan ${faltan} cr (aprobados + inscritos + planificados).`)
    }
  }
  if (cuposPendientes.length > 0) {
    advertencias.push({ tipo: 'cupos_incompletos', detalles: cuposPendientes })
  }

  // Libre elección pendiente: el motor no agenda excedentes ni códigos
  // fuera del pensum.
  const le = avancePorId.get('libre_eleccion')
  if (le && !cumpleCupo(le, planificados.get('libre_eleccion') ?? 0)) {
    const faltan = Math.max(
      0,
      le.creditos_exigidos - le.creditos_aprobados - le.creditos_inscritos,
    )
    if (faltan > 0) {
      advertencias.push({
        tipo: 'libre_eleccion_pendiente',
        mensaje: `Faltan ${faltan} cr de libre elección. Consíguelos con materias fuera del pensum o con excedentes de otros bloques.`,
      })
    }
  }

  return advertencias
}