import type { PensumGraph } from '../pensum/graph'
import type { CuelloBotella, MapaEstadoEfectivo } from '../pensum/types'

/**
 * Longitud de la cadena más larga de dependencias hacia adelante,
 * incluyendo la propia materia. Memoizado.
 */
export function calcularLongitudesCadena(graph: PensumGraph): Map<string, number> {
  const memo = new Map<string, number>()

  const visitar = (codigo: string, enPila: Set<string>): number => {
    const cache = memo.get(codigo)
    if (cache !== undefined) return cache
    if (enPila.has(codigo)) return 1 // protección ante ciclos (no debería ocurrir)

    enPila.add(codigo)
    const dependientes = graph.reverseAdj.get(codigo) ?? []
    let max = 0
    for (const dep of dependientes) {
      max = Math.max(max, visitar(dep, enPila))
    }
    enPila.delete(codigo)

    const resultado = 1 + max
    memo.set(codigo, resultado)
    return resultado
  }

  for (const codigo of graph.asignaturas.keys()) {
    visitar(codigo, new Set())
  }

  return memo
}

/**
 * Devuelve las materias no aprobadas con la cadena de dependencias más larga.
 */
export function detectarCuellosBotella(
  graph: PensumGraph,
  estado: MapaEstadoEfectivo,
  niveles: Map<string, number>,
  limite = 5,
): CuelloBotella[] {
  const longitudes = calcularLongitudesCadena(graph)

  const cuellos: CuelloBotella[] = []
  for (const a of graph.asignaturas.values()) {
    if ((estado.get(a.codigo) ?? 'no_vista') === 'aprobada') continue
    const cadena = longitudes.get(a.codigo) ?? 1
    cuellos.push({
      codigo: a.codigo,
      nombre: a.nombre,
      alias: a.alias ?? null,
      cadena_longitud: cadena,
      semestre_actual: (niveles.get(a.codigo) ?? 0) + 1,
      // Aproximación: el impacto de evitar la materia es proporcional a su cadena.
      costo_si_evita: cadena,
    })
  }

  cuellos.sort(
    (a, b) =>
      b.cadena_longitud - a.cadena_longitud ||
      a.codigo.localeCompare(b.codigo),
  )

  return cuellos.slice(0, limite)
}