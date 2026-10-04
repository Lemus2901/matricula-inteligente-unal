import type { PensumGraph } from '../pensum/graph'
import { calcularNiveles, type ResultadoNiveles } from '../pensum/validator'

/**
 * Orden topológico de las asignaturas (Kahn) y detección de ciclos.
 * Reexporta el cálculo usado por el validador para mantener una sola fuente.
 */
export function ordenarTopologicamente(graph: PensumGraph): ResultadoNiveles {
  return calcularNiveles(graph)
}

export type { ResultadoNiveles }