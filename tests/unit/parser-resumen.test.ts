import { describe, expect, it } from 'vitest'
import { parsearHistorialSIA } from '../../src/core/pensum/parser-sia'
import type { FilaResumenSIA } from '../../src/core/pensum/types'

/**
 * Bloque "Resumen de créditos" copiado tal cual del SIA (Portal de
 * Servicios Académicos). Los números son los de la historia académica real
 * de referencia; el parser no los hardcodea, solo los lee del texto.
 */

const FILAS_REAL: Array<[string, number, number, number, number, number]> = [
  ['DISCIPLINAR OPTATIVA', 22, 6, 16, 9, 6],
  ['FUND. OBLIGATORIA', 27, 27, 0, 0, 31],
  ['FUND. OPTATIVA', 16, 16, 0, 0, 19],
  ['DISCIPLINAR OBLIGATORIA', 57, 53, 4, 0, 56],
  ['LIBRE ELECCIÓN', 32, 26, 6, 5, 23],
  ['TRABAJO DE GRADO', 6, 0, 6, 0, 0],
  ['TOTAL', 160, 128, 32, 14, 135],
  ['NIVELACIÓN', 16, 16, 0, 0, 16],
  ['TOTAL ESTUDIANTE', 176, 144, 32, 14, 151],
]

function aFila([tipologia, exigidos, aprobados, pendientes, inscritos, cursados]:
  [string, number, number, number, number, number]): FilaResumenSIA {
  return { tipologia, exigidos, aprobados, pendientes, inscritos, cursados }
}

/** Variante real: encabezado celda-por-línea con líneas de solo tabs. */
const BLOQUE_CELDA_POR_LINEA = [
  'Resumen de créditos',
  '\t\t\t\t',
  'Tipologías',
  '\t',
  'Exigidos',
  '\t',
  'Aprobados',
  '\t',
  'Pendientes',
  '\t',
  'Inscritos',
  '\t',
  'Cursados',
  ...FILAS_REAL.map(([t, e, a, p, i, c]) => `${t}\t${e}\t${a}\t${p}\t${i}\t${c}`),
  ' \t',
  'Total Créditos Excedentes3',
  'Total de Créditos Cancelados en los Periodos Cursado0',
  'Porcentaje de Avance80,0%',
  'Créditos adicionales80Cupo de créditos87Créditos disponibles55',
].join('\n')

/** Variante: encabezado completo en una sola línea separado por tabs. */
const BLOQUE_UNA_LINEA = [
  'Resumen de créditos',
  'Tipologías\tExigidos\tAprobados\tPendientes\tInscritos\tCursados',
  ...FILAS_REAL.map(([t, e, a, p, i, c]) => `${t}\t${e}\t${a}\t${p}\t${i}\t${c}`),
  'Porcentaje de Avance80,0%',
].join('\n')

describe('parser-sia: Resumen de créditos', () => {
  it('extrae las tipologías del bloque real (encabezado celda-por-línea)', () => {
    const texto = [
      'CÁLCULO DIFERENCIAL (1000004-M) \t4\tFUND. OBLIGATORIA\t2022-1S Ordinaria\t4.1',
      'APROBADA',
      '',
      BLOQUE_CELDA_POR_LINEA,
    ].join('\n')

    const resultado = parsearHistorialSIA(texto)
    expect(resultado.resumen_creditos).toHaveLength(FILAS_REAL.length)
    expect(resultado.resumen_creditos).toEqual(FILAS_REAL.map(aFila))

    // Las líneas de excedentes/avance/cupo quedan fuera.
    const etiquetas = resultado.resumen_creditos.map((f) => f.tipologia)
    expect(etiquetas).not.toContain('Total Créditos Excedentes3')
    expect(etiquetas).not.toContain('Porcentaje de Avance80,0%')

    // El bloque no contamina el parseo de asignaturas.
    expect(resultado.items).toHaveLength(1)
    expect(resultado.items[0].codigo).toBe('1000004-M')
    expect(resultado.errores).toHaveLength(0)
  })

  it('acepta el encabezado en una sola línea', () => {
    const resultado = parsearHistorialSIA(BLOQUE_UNA_LINEA)
    expect(resultado.resumen_creditos).toHaveLength(FILAS_REAL.length)
    expect(resultado.resumen_creditos[0]).toEqual(
      aFila(FILAS_REAL[0]),
    )
    // El encabezado no se interpreta como fila de datos.
    expect(
      resultado.resumen_creditos.some((f) => f.tipologia === 'Tipologías'),
    ).toBe(false)
  })

  it('devuelve una lista vacía cuando el texto no incluye el bloque', () => {
    const texto = [
      'CÁLCULO DIFERENCIAL (1000004-M) \t4\tFUND. OBLIGATORIA\t2022-1S Ordinaria\t4.1',
      'APROBADA',
    ].join('\n')
    const resultado = parsearHistorialSIA(texto)
    expect(resultado.resumen_creditos).toEqual([])
  })

  it('si el bloque aparece dos veces, conserva la primera aparición', () => {
    const texto = `${BLOQUE_CELDA_POR_LINEA}\n${BLOQUE_UNA_LINEA}`
    const resultado = parsearHistorialSIA(texto)
    expect(resultado.resumen_creditos).toHaveLength(FILAS_REAL.length)
  })
})
