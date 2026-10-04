import { construirGrafo, type PensumGraph } from './graph'
import type { ComponenteId, Pensum } from './types'

export interface ValidacionPensum {
  ok: boolean
  errores: string[]
  advertencias: string[]
  /** Niveles topológicos (curso → nivel). Solo si no hay ciclos. */
  niveles: Map<string, number>
}

/**
 * Valida un pensum:
 * - códigos únicos
 * - prerrequisitos que existen
 * - grafo acíclico (Kahn)
 * - coherencia de créditos por componente
 */
export function validarPensum(pensum: Pensum): ValidacionPensum {
  const errores: string[] = []
  const advertencias: string[] = []

  // 1. Códigos únicos
  const vistos = new Set<string>()
  for (const a of pensum.asignaturas) {
    if (vistos.has(a.codigo)) {
      errores.push(`Código duplicado: ${a.codigo}`)
    }
    vistos.add(a.codigo)
  }

  const graph = construirGrafo(pensum)

  // 2. Prerrequisitos existentes
  for (const a of pensum.asignaturas) {
    for (const pre of a.prerrequisitos) {
      if (!graph.asignaturas.has(pre)) {
        errores.push(
          `${a.codigo} (${a.nombre}) tiene un prerrequisito inexistente: ${pre}`,
        )
      }
      if (pre === a.codigo) {
        errores.push(`${a.codigo} es prerrequisito de sí misma`)
      }
    }
  }

  // 3. Ciclos + niveles topológicos (Kahn)
  const { niveles, hayCiclo, nodosEnCiclo } = calcularNiveles(graph)
  if (hayCiclo) {
    errores.push(
      `El grafo tiene un ciclo de prerrequisitos. Nodos involucrados: ${nodosEnCiclo.join(', ')}`,
    )
  }

  // 4. Coherencia de créditos por componente
  for (const [id, info] of Object.entries(pensum.componentes) as [
    ComponenteId,
    { creditos_exigidos: number; creditos_obligatorios: number },
  ][]) {
    if (info.creditos_obligatorios > info.creditos_exigidos) {
      errores.push(
        `Componente ${id}: obligatorios (${info.creditos_obligatorios}) > exigidos (${info.creditos_exigidos})`,
      )
    }
    const materiasComponente = pensum.asignaturas.filter((a) => a.agrupacion === id)
    const sumaObligatorias = materiasComponente
      .filter((a) => a.obligatoria)
      .reduce((s, a) => s + a.creditos, 0)
    if (sumaObligatorias !== info.creditos_obligatorios) {
      advertencias.push(
        `Componente ${id}: créditos obligatorios declarados ${info.creditos_obligatorios}, ` +
          `suma de asignaturas obligatorias ${sumaObligatorias}`,
      )
    }
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
    niveles,
  }
}

export interface ResultadoNiveles {
  niveles: Map<string, number>
  hayCiclo: boolean
  nodosEnCiclo: string[]
}

/**
 * Calcula niveles topológicos con Kahn. Un nodo sin prerrequisitos queda en nivel 0.
 * Un prerrequisito debe estar aprobado antes; el dependiente queda al menos en prereq+1.
 */
export function calcularNiveles(graph: PensumGraph): ResultadoNiveles {
  const gradoEntrada = new Map<string, number>()
  for (const codigo of graph.asignaturas.keys()) {
    gradoEntrada.set(codigo, 0)
  }
  for (const a of graph.asignaturas.values()) {
    for (const pre of a.prerrequisitos) {
      if (graph.asignaturas.has(pre)) {
        gradoEntrada.set(a.codigo, (gradoEntrada.get(a.codigo) ?? 0) + 1)
      }
    }
  }

  const niveles = new Map<string, number>()
  const cola: string[] = []
  for (const [codigo, grado] of gradoEntrada) {
    if (grado === 0) {
      cola.push(codigo)
      niveles.set(codigo, 0)
    }
  }

  let procesados = 0
  while (cola.length > 0) {
    const actual = cola.shift()!
    procesados++
    const nivelActual = niveles.get(actual) ?? 0
    for (const dep of graph.reverseAdj.get(actual) ?? []) {
      niveles.set(dep, Math.max(niveles.get(dep) ?? 0, nivelActual + 1))
      const g = (gradoEntrada.get(dep) ?? 1) - 1
      gradoEntrada.set(dep, g)
      if (g === 0) cola.push(dep)
    }
  }

  const hayCiclo = procesados !== graph.asignaturas.size
  const nodosEnCiclo = hayCiclo
    ? [...graph.asignaturas.keys()].filter((c) => !niveles.has(c))
    : []

  return { niveles, hayCiclo, nodosEnCiclo }
}