import type {
  AvanceComponente,
  ComponenteId,
  HistorialAcademico,
  Pensum,
} from '../pensum/types'
import { calcularEstadoEfectivo } from './estado'

/** Nombres legibles de los componentes (tipologías) del pensum. */
export const NOMBRES_COMPONENTE: Record<ComponenteId, string> = {
  fundamentacion: 'Fundamentación',
  ciencias_computacion: 'Ciencias de la Computación',
  ingenieria_software: 'Ingeniería de Software',
  sistemas: 'Sistemas',
  proyectos_ingenieria: 'Proyectos en Ingeniería',
  optativas_tecnologicas: 'Disciplinar Optativa',
  trabajo_grado: 'Trabajo de Grado',
  libre_eleccion: 'Libre Elección',
}

export interface GrupoSIA {
  /** Etiqueta tal como aparece en el bloque "Resumen de créditos" del SIA. */
  etiqueta: string
  /** Componentes del pensum que componen esa tipología del SIA. */
  componentes: ComponenteId[]
}

/**
 * Agrupación del avance calculado bajo las tipologías del SIA, en el mismo
 * orden que el bloque "Resumen de créditos" (§17.1 del spec).
 *
 * - FUND. OBLIGATORIA y FUND. OPTATIVA del SIA son un solo componente en el
 *   pensum (fundamentacion = 27 + 16).
 * - DISCIPLINAR OBLIGATORIA del SIA se divide en las cuatro agrupaciones
 *   disciplinares del programa curricular (27 + 9 + 11 + 10 = 57).
 * - NIVELACIÓN no aparece: no cuenta para la graduación.
 *
 * Cada ComponenteId aparece exactamente una vez (lo verifican los tests).
 */
export const GRUPOS_SIA: GrupoSIA[] = [
  { etiqueta: 'DISCIPLINAR OPTATIVA', componentes: ['optativas_tecnologicas'] },
  {
    etiqueta: 'FUND. OBLIGATORIA + FUND. OPTATIVA',
    componentes: ['fundamentacion'],
  },
  {
    etiqueta: 'DISCIPLINAR OBLIGATORIA',
    componentes: [
      'ciencias_computacion',
      'ingenieria_software',
      'sistemas',
      'proyectos_ingenieria',
    ],
  },
  { etiqueta: 'LIBRE ELECCIÓN', componentes: ['libre_eleccion'] },
  { etiqueta: 'TRABAJO DE GRADO', componentes: ['trabajo_grado'] },
]

/**
 * Calcula el avance del estudiante por componente (tipología).
 *
 * Reglas:
 * - Códigos dentro del pensum cuentan al componente de su `agrupacion`.
 * - Códigos fuera del pensum cuentan como libre elección.
 * - Los estados "en curso" cuentan como créditos inscritos de su componente.
 * - Los excedentes (aprobados por encima del exigido de un componente)
 *   suman a libre elección, como en el SIA.
 */
export function calcularAvance(
  pensum: Pensum,
  historial: HistorialAcademico,
): AvanceComponente[] {
  const estado = calcularEstadoEfectivo(historial)
  const porCodigo = new Map(pensum.asignaturas.map((a) => [a.codigo, a]))
  const creditosHistorial = new Map(
    historial.map((h) => [h.codigo, h.creditos_inscritos ?? 0]),
  )

  const aprobados = new Map<ComponenteId, number>()
  const inscritos = new Map<ComponenteId, number>()
  let fueraPensumAprobados = 0
  let fueraPensumInscritos = 0

  for (const [codigo, est] of estado) {
    if (est === 'no_vista') continue
    const asignatura = porCodigo.get(codigo)
    const creditos = asignatura
      ? asignatura.creditos
      : (creditosHistorial.get(codigo) ?? 0)

    if (!asignatura) {
      if (est === 'aprobada') fueraPensumAprobados += creditos
      else if (est === 'en_curso') fueraPensumInscritos += creditos
      continue
    }

    const comp = asignatura.agrupacion
    if (est === 'aprobada') {
      aprobados.set(comp, (aprobados.get(comp) ?? 0) + creditos)
    } else if (est === 'en_curso') {
      inscritos.set(comp, (inscritos.get(comp) ?? 0) + creditos)
    }
  }

  // Excedentes de cada componente (excepto libre elección) van a libre elección.
  let excedenteTotal = 0
  const excedentes = new Map<ComponenteId, number>()
  for (const [id, info] of Object.entries(pensum.componentes)) {
    if (id === 'libre_eleccion') continue
    const excedente = Math.max(
      0,
      (aprobados.get(id as ComponenteId) ?? 0) - info.creditos_exigidos,
    )
    excedentes.set(id as ComponenteId, excedente)
    excedenteTotal += excedente
  }

  const resultado: AvanceComponente[] = []
  for (const [id, info] of Object.entries(pensum.componentes)) {
    const comp = id as ComponenteId
    let aprob: number
    let insc: number
    let excedente = 0

    if (comp === 'libre_eleccion') {
      aprob = (aprobados.get(comp) ?? 0) + fueraPensumAprobados + excedenteTotal
      insc = (inscritos.get(comp) ?? 0) + fueraPensumInscritos
    } else {
      aprob = aprobados.get(comp) ?? 0
      insc = inscritos.get(comp) ?? 0
      excedente = excedentes.get(comp) ?? 0
    }

    resultado.push({
      componente: comp,
      nombre: NOMBRES_COMPONENTE[comp] ?? comp,
      creditos_exigidos: info.creditos_exigidos,
      creditos_obligatorios: info.creditos_obligatorios,
      creditos_aprobados: aprob,
      creditos_inscritos: insc,
      excedente,
      cumple: aprob + insc >= info.creditos_exigidos,
    })
  }

  return resultado
}

/** Índice por id para consultas rápidas. */
export function indexarAvance(
  avance: AvanceComponente[],
): Map<ComponenteId, AvanceComponente> {
  return new Map(avance.map((a) => [a.componente, a]))
}

/**
 * Un cupo se cumple si aprobados + inscritos + créditos ya planificados
 * en esta ruta alcanzan el exigido.
 */
export function cumpleCupo(
  avance: AvanceComponente | undefined,
  planificados: number,
): boolean {
  if (!avance) return false
  return (
    avance.creditos_aprobados + avance.creditos_inscritos + planificados >=
    avance.creditos_exigidos
  )
}

/** Créditos que faltan para cumplir un cupo (0 si ya se cumple). */
export function faltanCupo(
  avance: AvanceComponente | undefined,
  planificados: number,
): number {
  if (!avance) return 0
  return Math.max(
    0,
    avance.creditos_exigidos -
      avance.creditos_aprobados -
      avance.creditos_inscritos -
      planificados,
  )
}
