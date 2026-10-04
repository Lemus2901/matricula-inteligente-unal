import { describe, it, expect } from 'vitest'
import { calcularEstadoEfectivo, calcularHabilitadas, quedanPendientes } from '../../src/core/algorithm/estado'
import { construirGrafo } from '../../src/core/pensum/graph'
import { planificar } from '../../src/core/algorithm/dp-planner'
import { detectarCuellosBotella, calcularLongitudesCadena } from '../../src/core/algorithm/bottleneck'
import { parsearHistorialSIA } from '../../src/core/pensum/parser-sia'
import type { Pensum, HistorialAcademico, PerfilEstudiante, MapaEstadoEfectivo, FiltroMateria } from '../../src/core/pensum/types'

const pensumMock: Pensum = {
  pensum_id: 'test',
  programa: 'Test',
  facultad: 'Test',
  sede: 'Test',
  creditos_totales: 30,
  asignaturas: [
    { codigo: 'A', nombre: 'A', creditos: 3, obligatoria: true, semestre_en_plan: 1, prerrequisitos: [], agrupacion: 'fundamentacion', verificado: true, fuente_ref: 'test' },
    { codigo: 'B', nombre: 'B', creditos: 3, obligatoria: true, semestre_en_plan: 2, prerrequisitos: ['A'], agrupacion: 'fundamentacion', verificado: true, fuente_ref: 'test' },
    { codigo: 'C', nombre: 'C', creditos: 3, obligatoria: true, semestre_en_plan: 3, prerrequisitos: ['B'], agrupacion: 'ciencias_computacion', verificado: true, fuente_ref: 'test' },
    { codigo: 'D', nombre: 'D', creditos: 3, obligatoria: true, semestre_en_plan: 4, prerrequisitos: ['C'], agrupacion: 'ciencias_computacion', verificado: true, fuente_ref: 'test' },
    { codigo: 'E', nombre: 'E', creditos: 3, obligatoria: false, semestre_en_plan: 2, prerrequisitos: ['A'], agrupacion: 'optativas_tecnologicas', verificado: true, fuente_ref: 'test' },
    { codigo: 'F', nombre: 'F', creditos: 3, obligatoria: false, semestre_en_plan: 3, prerrequisitos: ['B'], agrupacion: 'optativas_tecnologicas', verificado: true, fuente_ref: 'test' },
  ],
  componentes: {
    fundamentacion: { creditos_exigidos: 12, creditos_obligatorios: 6 },
    ciencias_computacion: { creditos_exigidos: 6, creditos_obligatorios: 6 },
    optativas_tecnologicas: { creditos_exigidos: 6, creditos_obligatorios: 0 },
    ingenieria_software: { creditos_exigidos: 0, creditos_obligatorios: 0 },
    sistemas: { creditos_exigidos: 0, creditos_obligatorios: 0 },
    proyectos_ingenieria: { creditos_exigidos: 0, creditos_obligatorios: 0 },
    trabajo_grado: { creditos_exigidos: 0, creditos_obligatorios: 0 },
    libre_eleccion: { creditos_exigidos: 0, creditos_obligatorios: 0 },
  },
}

const perfilBasico: PerfilEstudiante = {
  pensum_id: 'test',
  creditos_minimos: 6,
  creditos_maximos: 9,
  prioridad: 'rapido',
  semestre_objetivo: 4,
}

describe('estado.ts', () => {
  it('calcula estado efectivo correctamente', () => {
    const historial: HistorialAcademico = [
      { codigo: 'A', estado: 'aprobada' },
      { codigo: 'B', estado: 'perdida' },
      { codigo: 'C', estado: 'en_curso' },
    ]
    const estado = calcularEstadoEfectivo(historial)
    expect(estado.get('A')).toBe('aprobada')
    expect(estado.get('B')).toBe('perdida')
    expect(estado.get('C')).toBe('en_curso')
    // La función solo devuelve estados para códigos en el historial
    expect(estado.has('D')).toBe(false)
  })

  it('calcula habilitadas sin prerrequisitos', () => {
    const graph = construirGrafo(pensumMock)
    const estado = new Map<string, any>([['A', 'aprobada']])
    const habilitadas = calcularHabilitadas(graph, estado)
    expect(habilitadas.has('B')).toBe(true)
    expect(habilitadas.has('E')).toBe(true)
    expect(habilitadas.has('C')).toBe(false)
  })

  it('detecta materias pendientes', () => {
    const graph = construirGrafo(pensumMock)
    const estado = new Map<string, any>([['A', 'aprobada']])
    const pendientes = quedanPendientes(construirGrafo(pensumMock), estado)
    expect(pendientes.length).toBeGreaterThan(0)
  })
})

describe('dp-planner.ts', () => {
  it('genera ruta para estudiante sin historial', () => {
    const perfil: PerfilEstudiante = { ...perfilBasico, historial: [] }
    const input = {
      pensum: pensumMock,
      historial: [],
      filtros: [],
      perfil: perfilBasico,
    }
    const ruta = planificar(input)
    expect(ruta.semestres.length).toBeGreaterThan(0)
    expect(ruta.total_semestres).toBeGreaterThan(0)
    expect(ruta.proximas_materias.length).toBeGreaterThan(0)
  })

  it('respeta créditos máximos por semestre', () => {
    const perfilConMax: PerfilEstudiante = { ...perfilBasico, creditos_maximos: 6 }
    const input = {
      pensum: pensumMock,
      historial: [],
      filtros: [],
      perfil: perfilConMax,
    }
    const ruta = planificar(input)
    for (const sem of ruta.semestres) {
      expect(sem.total_creditos).toBeLessThanOrEqual(6)
    }
  })

  it('respeta filtro "evitar"', () => {
    const input = {
      pensum: pensumMock,
      historial: [],
      filtros: [{ codigo: 'B', tipo: 'evitar', semestre_aplica: 1 } as FiltroMateria],
      perfil: perfilBasico,
    }
    const ruta = planificar(input)
    const sem1 = ruta.semestres[0]
    expect(sem1.materias.some(m => m.codigo === 'B')).toBe(false)
  })

  it('respeta filtro "sí o sí"', () => {
    const input = {
      pensum: pensumMock,
      historial: [],
      filtros: [{ codigo: 'E', tipo: 'si_o_si', semestre_aplica: 1 } as FiltroMateria],
      perfil: perfilBasico,
    }
    const ruta = planificar(input)
    const sem1 = ruta.semestres[0]
    expect(sem1.materias.some(m => m.codigo === 'E')).toBe(true)
  })
})

describe('bottleneck.ts', () => {
  it('detecta cuellos de botella en cadena lineal', () => {
    const graph = construirGrafo(pensumMock)
    const estado = new Map<string, any>()
    const niveles = new Map<string, number>([
      ['A', 0], ['B', 1], ['C', 2], ['D', 3], ['E', 1], ['F', 2],
    ])
    const cuellos = detectarCuellosBotella(graph, new Map(), niveles)
    expect(cuellos.length).toBeGreaterThan(0)
    expect(cuellos[0].codigo).toBe('A')
  })

  it('calcula longitudes de cadena correctamente', () => {
    const graph = construirGrafo(pensumMock)
    const longitudes = calcularLongitudesCadena(graph)
    expect(longitudes.get('A')).toBeGreaterThan(longitudes.get('B') ?? 0)
    expect(longitudes.get('D')).toBe(1)
  })
})

describe('parser-sia.ts', () => {
  it('parsea formato SIA básico', () => {
    const texto = `Asignaturas\tAsignaturas\tCréditos\tTipo\tPeriodo\tCalificación
Materia A (1234567)\t3\tOBLIGATORIA\t2023-1S\t4.0
APROBADA`
    const resultado = parsearHistorialSIA(texto)
    expect(resultado.items.length).toBe(1)
    expect(resultado.items[0].codigo).toBe('1234567')
    expect(resultado.items[0].estado).toBe('aprobada')
  })
})