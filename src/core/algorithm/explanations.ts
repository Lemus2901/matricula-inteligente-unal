import type { PensumGraph } from '../pensum/graph'
import type {
  AvanceComponente,
  ComponenteId,
  MapaEstadoEfectivo,
  MateriaPlanificada,
  RazonCodigo,
} from '../pensum/types'

export interface ContextoRazon {
  graph: PensumGraph
  estado: MapaEstadoEfectivo
  siSiEsteSemestre: Set<string>
  longitudesCadena: Map<string, number>
  avance?: Map<ComponenteId, AvanceComponente>
  planificados?: Map<ComponenteId, number>
}

/** Determina la razón principal por la que una materia se incluye. */
export function calcularRazon(
  codigo: string,
  ctx: ContextoRazon,
): { razon: RazonCodigo; razon_texto: string } {
  const asignatura = ctx.graph.asignaturas.get(codigo)
  if (!asignatura) {
    return { razon: 'obligatoria_plan', razon_texto: 'Materia del plan.' }
  }

  const nombre = asignatura.alias ?? asignatura.nombre
  const dependientes = (ctx.graph.reverseAdj.get(codigo) ?? []).filter(
    (d) => (ctx.estado.get(d) ?? 'no_vista') !== 'aprobada',
  )
  const cadena = ctx.longitudesCadena.get(codigo) ?? 1

  if (ctx.siSiEsteSemestre.has(codigo)) {
    return {
      razon: 'filtro_si_o_si',
      razon_texto: `La marcaste como "sí o sí" para este semestre.`,
    }
  }

  // Cursos no obligatorios de un cupo pendiente: explican el cupo que
  // contribuyen a cubrir (RF-22 / RN-10).
  if (!asignatura.obligatoria && ctx.avance) {
    const av = ctx.avance.get(asignatura.agrupacion)
    const planificados = ctx.planificados?.get(asignatura.agrupacion) ?? 0
    if (av && av.componente !== 'libre_eleccion') {
      const faltan = Math.max(
        0,
        av.creditos_exigidos -
          av.creditos_aprobados -
          av.creditos_inscritos -
          planificados,
      )
      if (faltan > 0) {
        const razon: RazonCodigo =
          asignatura.agrupacion === 'optativas_tecnologicas'
            ? 'optativa_tecnologica'
            : 'prerrequisito_cumplido'
        return {
          razon,
          razon_texto: `Cuenta para ${av.nombre} — te faltan ${faltan} cr (incluye inscritos).`,
        }
      }
    }
  }

  if (dependientes.length > 0 && cadena >= 3) {
    return {
      razon: 'cuello_botella',
      razon_texto: `${nombre} desbloquea ${dependientes.length} materia(s) y encabeza una cadena de ${cadena}.`,
    }
  }

  if (dependientes.length > 0) {
    return {
      razon: 'desbloquea_otras',
      razon_texto: `Desbloquea ${dependientes.length} materia(s) posterior(es).`,
    }
  }

  if (asignatura.agrupacion === 'optativas_tecnologicas') {
    return {
      razon: 'optativa_tecnologica',
      razon_texto: 'Optativa de tecnologías que suma créditos al componente.',
    }
  }

  if (asignatura.agrupacion === 'libre_eleccion') {
    return {
      razon: 'libre_eleccion',
      razon_texto: 'Crédito de libre elección.',
    }
  }

  if (asignatura.obligatoria) {
    return {
      razon: 'obligatoria_plan',
      razon_texto: 'Materia obligatoria del plan que ya puedes ver.',
    }
  }

  return {
    razon: 'prerrequisito_cumplido',
    razon_texto: 'Cumples todos sus prerrequisitos.',
  }
}

/** Construye la materia planificada con su razón. */
export function construirMateriaPlanificada(
  codigo: string,
  ctx: ContextoRazon,
): MateriaPlanificada | null {
  const asignatura = ctx.graph.asignaturas.get(codigo)
  if (!asignatura) return null
  const { razon, razon_texto } = calcularRazon(codigo, ctx)
  return {
    codigo: asignatura.codigo,
    nombre: asignatura.nombre,
    alias: asignatura.alias ?? null,
    creditos: asignatura.creditos,
    razon,
    razon_texto,
  }
}

/** Explica por qué una materia no se puede ver. */
export function generarMensajeBloqueo(
  codigo: string,
  graph: PensumGraph,
  estado: MapaEstadoEfectivo,
): string {
  const asignatura = graph.asignaturas.get(codigo)
  if (!asignatura) return `La materia ${codigo} no está en el pensum.`

  const nombre = asignatura.alias ?? asignatura.nombre
  const faltantes = asignatura.prerrequisitos.filter(
    (pre) => (estado.get(pre) ?? 'no_vista') !== 'aprobada',
  )

  if (faltantes.length > 0) {
    const nombres = faltantes
      .map((f) => {
        const m = graph.asignaturas.get(f)
        return m ? (m.alias ?? m.nombre) : f
      })
      .join(', ')
    return `No puedes ver ${nombre} porque te falta: ${nombres}.`
  }

  return `No puedes ver ${nombre} por una restricción pendiente (porcentaje de avance o cupo).`
}