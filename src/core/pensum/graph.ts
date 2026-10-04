import type { Asignatura, Pensum } from './types'

export interface PensumGraph {
  pensum: Pensum
  asignaturas: Map<string, Asignatura>
  /** curso → códigos de sus prerrequisitos */
  prereqAdj: Map<string, string[]>
  /** curso → códigos que dependen de él */
  reverseAdj: Map<string, string[]>
}

/** Construye las estructuras de grafo a partir del pensum. */
export function construirGrafo(pensum: Pensum): PensumGraph {
  const asignaturas = new Map<string, Asignatura>()
  const prereqAdj = new Map<string, string[]>()
  const reverseAdj = new Map<string, string[]>()

  for (const a of pensum.asignaturas) {
    asignaturas.set(a.codigo, a)
    prereqAdj.set(a.codigo, [...a.prerrequisitos])
    reverseAdj.set(a.codigo, [])
  }

  for (const a of pensum.asignaturas) {
    for (const pre of a.prerrequisitos) {
      const dependientes = reverseAdj.get(pre)
      if (dependientes) dependientes.push(a.codigo)
    }
  }

  return { pensum, asignaturas, prereqAdj, reverseAdj }
}