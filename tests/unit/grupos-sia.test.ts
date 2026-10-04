import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { GRUPOS_SIA, calcularAvance } from '../../src/core/algorithm/cupos'
import { HISTORIAL_SIA_REAL } from '../fixtures/historial-sia-real'
import type { ComponenteId, Pensum } from '../../src/core/pensum/types'

const rutaPensum = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public/data/pensum-sistemas-minas.json',
)
const pensum = JSON.parse(readFileSync(rutaPensum, 'utf8')) as Pensum

function exigidosDelGrupo(grupo: { componentes: ComponenteId[] }): number {
  return grupo.componentes.reduce(
    (s, c) => s + pensum.componentes[c].creditos_exigidos,
    0,
  )
}

describe('GRUPOS_SIA (cálculo agrupado bajo las tipologías del SIA)', () => {
  it('cubre exactamente una vez todos los componentes del pensum', () => {
    const ids = GRUPOS_SIA.flatMap((g) => g.componentes)
    expect(new Set(ids).size).toBe(ids.length) // sin duplicados
    expect([...ids].sort()).toEqual(Object.keys(pensum.componentes).sort())
  })

  it('usa las etiquetas y el orden del bloque "Resumen de créditos" (NIVELACIÓN excluida)', () => {
    expect(GRUPOS_SIA.map((g) => g.etiqueta)).toEqual([
      'DISCIPLINAR OPTATIVA',
      'FUND. OBLIGATORIA + FUND. OPTATIVA',
      'DISCIPLINAR OBLIGATORIA',
      'LIBRE ELECCIÓN',
      'TRABAJO DE GRADO',
    ])
  })

  it('los subtotales de exigidos cuadran con las tipologías del SIA', () => {
    expect(exigidosDelGrupo(GRUPOS_SIA[0])).toBe(22) // DISCIPLINAR OPTATIVA
    expect(exigidosDelGrupo(GRUPOS_SIA[1])).toBe(43) // 27 (FUND. OBL.) + 16 (FUND. OPT.)
    expect(exigidosDelGrupo(GRUPOS_SIA[2])).toBe(57) // 27 + 9 + 11 + 10
    expect(exigidosDelGrupo(GRUPOS_SIA[3])).toBe(33) // pensum (el SIA reporta 32; divergencia documentada)
    expect(exigidosDelGrupo(GRUPOS_SIA[4])).toBe(6) // TRABAJO DE GRADO
  })

  it('el avance calculado con el historial real se agrupa sin perder filas', () => {
    const avance = calcularAvance(pensum, HISTORIAL_SIA_REAL)
    const enGrupos = new Set(GRUPOS_SIA.flatMap((g) => g.componentes))
    expect(avance.every((a) => enGrupos.has(a.componente))).toBe(true)
    expect(enGrupos.size).toBe(avance.length)
  })
})
