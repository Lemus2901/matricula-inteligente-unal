import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { HISTORIAL_SIA_REAL } from '../fixtures/historial-sia-real'
import { planificar } from '../../src/core/algorithm/dp-planner'
import { calcularEstadoEfectivo } from '../../src/core/algorithm/estado'
import { calcularAvance } from '../../src/core/algorithm/cupos'
import type { HistorialAcademico, PerfilEstudiante, Pensum } from '../../src/core/pensum/types'

const rutaPensum = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../public/data/pensum-sistemas-minas.json',
)
const pensum = JSON.parse(readFileSync(rutaPensum, 'utf8')) as Pensum

const perfil: PerfilEstudiante = {
  pensum_id: pensum.pensum_id,
  prioridad: 'rapido',
}

describe('historial real del SIA (fixture)', () => {
  it('resuelve los duplicados: gana la aprobada', () => {
    const estado = calcularEstadoEfectivo(HISTORIAL_SIA_REAL)
    expect(HISTORIAL_SIA_REAL.filter((h) => h.codigo === '1000005-M')).toHaveLength(2)
    expect(HISTORIAL_SIA_REAL.filter((h) => h.codigo === '3010435')).toHaveLength(2)
    expect(estado.get('1000005-M')).toBe('aprobada')
    expect(estado.get('3010435')).toBe('aprobada')
  })

  it('el avance por tipología refleja el historial real', () => {
    const avance = calcularAvance(pensum, HISTORIAL_SIA_REAL)
    for (const a of avance) {
      console.log(
        `${a.componente}: ${a.creditos_aprobados}/${a.creditos_exigidos} (inscritos ${a.creditos_inscritos}, excedente ${a.excedente}) cumple=${a.cumple}`,
      )
    }
    expect(avance).toHaveLength(Object.keys(pensum.componentes).length)

    const porId = new Map(avance.map((a) => [a.componente, a]))
    // Valores reales del resumen SIA del estudiante:
    // DiscOpt 6/22, DiscOblig 53/57 (= 27+9+11+6 sobre 57), TG 0/6, LE 26.
    expect(porId.get('fundamentacion')).toMatchObject({
      creditos_aprobados: 46, creditos_exigidos: 43, excedente: 3, cumple: true,
    })
    expect(porId.get('ciencias_computacion')).toMatchObject({ creditos_aprobados: 27, cumple: true })
    expect(porId.get('ingenieria_software')).toMatchObject({ creditos_aprobados: 9, cumple: true })
    expect(porId.get('sistemas')).toMatchObject({ creditos_aprobados: 11, cumple: true })
    expect(porId.get('proyectos_ingenieria')).toMatchObject({
      creditos_aprobados: 6, creditos_exigidos: 10, cumple: false,
    })
    expect(porId.get('optativas_tecnologicas')).toMatchObject({
      creditos_aprobados: 6, creditos_exigidos: 22, cumple: false,
    })
    expect(porId.get('trabajo_grado')).toMatchObject({
      creditos_aprobados: 0, creditos_exigidos: 6, cumple: false,
    })
    expect(porId.get('libre_eleccion')?.creditos_aprobados).toBe(26)
  })

  it('NO recomienda materias que el estudiante nunca tomó si su cupo ya está cubierto', () => {
    const ruta = planificar({
      pensum,
      historial: HISTORIAL_SIA_REAL,
      filtros: [],
      perfil,
    })

    const todasLasRecomendadas = ruta.semestres.flatMap((s) => s.materias.map((m) => m.codigo))
    console.log('total_semestres:', ruta.total_semestres)
    console.log('proximas:', ruta.proximas_materias.map((m) => `${m.codigo} ${m.nombre} — ${m.razon_texto}`))

    // Fundamentación ya está cubierta: estas materias no deben salir nunca.
    expect(todasLasRecomendadas).not.toContain('3006829') // Química General
    expect(todasLasRecomendadas).not.toContain('1000017-M') // Física de Electricidad y Magnetismo
    expect(todasLasRecomendadas).not.toContain('1000006-M') // Cálculo en Varias Variables

    expect(ruta.bloqueo).toBeNull()
    expect(ruta.total_semestres).toBeGreaterThan(0)
    expect(ruta.total_semestres).toBeLessThanOrEqual(15)

    // Los cuellos de botella solo muestran materias necesarias: una optativa
    // de fundamentación con cupo cubierto no es cuello.
    const codigosCuellos = ruta.cuellos_botella.map((c) => c.codigo)
    expect(codigosCuellos).not.toContain('3006829')
    expect(codigosCuellos).not.toContain('1000006-M')

    // Libre elección pendiente se reporta como advertencia, no como bloqueo.
    expect(ruta.avance.find((a) => a.componente === 'libre_eleccion')?.cumple).toBe(false)
    expect(ruta.advertencias.some((a) => a.tipo === 'libre_eleccion_pendiente')).toBe(true)
  })

  it('las materias inscritas (en curso) no se recomiendan y suman al cupo de su tipología', () => {
    const historialEnCurso: HistorialAcademico = [
      ...HISTORIAL_SIA_REAL,
      { codigo: '3010425', estado: 'en_curso', periodo: '2026-1S Ordinaria', creditos_inscritos: 3 },
    ]
    const avance = calcularAvance(pensum, historialEnCurso)
    const optativas = avance.find((a) => a.componente === 'optativas_tecnologicas')
    expect(optativas?.creditos_inscritos).toBe(3)

    const ruta = planificar({
      pensum,
      historial: historialEnCurso,
      filtros: [],
      perfil,
    })
    const proximas = ruta.proximas_materias.map((m) => m.codigo)
    expect(proximas).not.toContain('3010425')
    const algunaVez = ruta.semestres.some((s) => s.materias.some((m) => m.codigo === '3010425'))
    expect(algunaVez).toBe(false)
  })

  it('explica las materias recomendadas por su cupo pendiente', () => {
    const ruta = planificar({
      pensum,
      historial: HISTORIAL_SIA_REAL,
      filtros: [],
      perfil,
    })
    const optativas = ruta.proximas_materias.filter(
      (m) => m.razon === 'optativa_tecnologica',
    )
    expect(optativas.length).toBeGreaterThan(0)
    for (const m of optativas) {
      expect(m.razon_texto).toMatch(/Cuenta para Disciplinar Optativa — te faltan \d+ cr/)
    }
  })
})
