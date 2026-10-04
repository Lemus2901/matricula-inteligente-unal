import type { PensumGraph } from '../pensum/graph'
import type {
  EstadoEfectivo,
  HistorialAcademico,
  MapaEstadoEfectivo,
} from '../pensum/types'

/**
 * Agrupa el historial por asignatura y calcula el estado efectivo.
 * Prioridad: aprobada > en_curso > perdida.
 */
export function calcularEstadoEfectivo(
  historial: HistorialAcademico,
): MapaEstadoEfectivo {
  const mapa: MapaEstadoEfectivo = new Map()

  for (const item of historial) {
    const previo = mapa.get(item.codigo)
    const nuevo = resolverEstado(previo, item.estado)
    mapa.set(item.codigo, nuevo)
  }

  return mapa
}

function resolverEstado(
  previo: EstadoEfectivo | undefined,
  entrante: EstadoEfectivo,
): EstadoEfectivo {
  if (previo === 'aprobada' || entrante === 'aprobada') return 'aprobada'
  if (previo === 'en_curso' || entrante === 'en_curso') return 'en_curso'
  return 'perdida'
}

/**
 * Materias habilitadas: no aprobadas, no en curso, y con todos sus
 * prerrequisitos aprobados.
 */
export function calcularHabilitadas(
  graph: PensumGraph,
  estado: MapaEstadoEfectivo,
): Set<string> {
  const habilitadas = new Set<string>()

  for (const a of graph.asignaturas.values()) {
    const estadoActual = estado.get(a.codigo) ?? 'no_vista'
    if (estadoActual === 'aprobada' || estadoActual === 'en_curso') continue

    const prereqsOk = a.prerrequisitos.every(
      (pre) => (estado.get(pre) ?? 'no_vista') === 'aprobada',
    )
    if (prereqsOk) habilitadas.add(a.codigo)
  }

  return habilitadas
}

/** Materias que aún no están aprobadas. */
export function quedanPendientes(
  graph: PensumGraph,
  estado: MapaEstadoEfectivo,
): string[] {
  const pendientes: string[] = []
  for (const a of graph.asignaturas.values()) {
    if ((estado.get(a.codigo) ?? 'no_vista') !== 'aprobada') {
      pendientes.push(a.codigo)
    }
  }
  return pendientes
}