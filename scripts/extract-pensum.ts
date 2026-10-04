/**
 * Extractor build-time del pensum — Matrícula Inteligente UNAL.
 *
 * Lee el PDF oficial (con layout) y genera public/data/pensum-sistemas-minas.json
 * en el formato canónico (ver DOCS/ESPECIFICACION-TECNICA.md §13.4).
 *
 * Uso:  npm run extract:pensum
 *
 * Requiere `pdftotext` (poppler-utils) para preservar la disposición en columnas.
 * La extracción es asistida: los campos se marcan con `verificado` y `fuente_ref`
 * y deben contrastarse fila por fila contra el PDF.
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  Asignatura,
  ComponenteId,
  ComponenteInfo,
  Pensum,
  RequisitoPorcentaje,
} from '../src/core/pensum/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PDF_PATH = resolve(ROOT, 'public/data/programa-curricular.pdf')
const OUT_PATH = resolve(ROOT, 'public/data/pensum-sistemas-minas.json')

// ─────────────────────────── Configuración de secciones ───────────────────────────

interface SeccionConfig {
  componente: ComponenteId
  obligatoria: boolean
  /** Columna (índice de carácter) donde inicia el código. */
  codeCol: number
  /** Columna donde inicia la columna REQUISITOS. */
  reqCol: number
  /** Límite derecho del segmento de requisitos (inicio de la otra tabla o fin). */
  reqEnd: number
  /** Marcador de inicio de la sección. */
  startMarker: string
  /** Marcador de fin. */
  endMarker: string
}

const SECCIONES: SeccionConfig[] = [
  {
    componente: 'fundamentacion',
    obligatoria: true,
    codeCol: 3,
    reqCol: 78,
    reqEnd: 142,
    startMarker: 'Ciencias Básicas',
    endMarker: 'CRÉDITOS: EXIGIDOS: 43',
  },
  {
    componente: 'ciencias_computacion',
    obligatoria: true,
    codeCol: 142,
    reqCol: 214,
    reqEnd: 400,
    startMarker: 'Ciencias de la Computación',
    endMarker: 'CRÉDITOS: EXIGIDOS: 27',
  },
  {
    componente: 'ingenieria_software',
    obligatoria: true,
    codeCol: 142,
    reqCol: 214,
    reqEnd: 400,
    startMarker: 'Ingeniería de Software',
    endMarker: 'CRÉDITOS: EXIGIDOS: 9',
  },
  {
    componente: 'sistemas',
    obligatoria: true,
    codeCol: 3,
    reqCol: 78,
    reqEnd: 145,
    startMarker: '3010438',
    endMarker: 'CRÉDITOS: EXIGIDOS: 11',
  },
  {
    componente: 'proyectos_ingenieria',
    obligatoria: true,
    codeCol: 3,
    reqCol: 78,
    reqEnd: 145,
    startMarker: 'Proyectos en Ingeniería',
    endMarker: 'CRÉDITOS: EXIGIDOS: 10',
  },
]

const CODE_RE = /\d{7}(?:-M)?/g
const ROW_RE = /^\s*(\d{7}(?:-M)?)\s+(.*?)\s+(\d)\s+(Si|No|SI|NO)\s*$/
const ROW_SIN_CREDITOS_RE = /^\s*(\d{7}(?:-M)?)\s+(.*?)\s+(Si|No|SI|NO)\s*$/

// ─────────────────────────── Mapa de semestres (malla visual) ───────────────────────────

const SEMESTRE_EN_PLAN: Record<string, number> = {
  '1000008-M': 1,
  '3006906': 1,
  '3010438': 1,
  '1000003-M': 2,
  '1000004-M': 2,
  '3010435': 2,
  '1000019-M': 3,
  '1000005-M': 3,
  '3007744': 3,
  '3010426': 3,
  '3010651': 4,
  '3007324': 4,
  '3007741': 4,
  '3007867': 4,
  '3007853': 4,
  '3007331': 5,
  '3007847': 5,
  '3007865': 5,
  '3007852': 5,
  '3010415': 6,
  '3010476': 6,
  '3011020': 6,
  '3010440': 6,
  '3010408': 7,
  '3010407': 8,
  '3010439': 9,
  '3007868': 10,
}

// ─────────────────────────── Alias (nombres reconocibles) ───────────────────────────

const ALIAS: Record<string, string> = {
  '3010408': 'Seminario 1',
  '3010407': 'Seminario 2',
  '3010439': 'Seminario 3',
}

// ─────────────────────────── Correcciones verificadas contra el PDF ───────────────────────────

// El PDF imprime códigos erróneos o el layout en columnas confunde los requisitos.
// Estos valores se verificaron manualmente fila por fila.
const PREREQ_OVERRIDES: Record<string, string[]> = {
  '1000007-M': ['1000005-M', '1000003-M'],
  '3006907': ['1000005-M', '1000003-M'],
  '3007324': ['3010435', '1000003-M'],
  '3010408': [],
  '3010407': ['3010408'],
  '3010439': ['3010407'],
}

const NOMBRE_OVERRIDES: Record<string, string> = {
  '1000020-M': 'Física de Oscilaciones, Ondas y Óptica',
}

// ─────────────────────────── Optativas de Tecnologías (verificadas) ───────────────────────────

interface OptativaSeed {
  codigo: string
  nombre: string
  creditos: number
  prerrequisitos: string[]
}

const OPTATIVAS: OptativaSeed[] = [
  { codigo: '3007862', nombre: 'Visión Artificial', creditos: 3, prerrequisitos: ['3010476'] },
  { codigo: '3009150', nombre: 'Redes Neuronales Artificiales y Algoritmos Bioinspirados', creditos: 3, prerrequisitos: ['3010476'] },
  { codigo: '3009151', nombre: 'Introducción a la Robótica', creditos: 3, prerrequisitos: ['3010476'] },
  { codigo: '3007850', nombre: 'Diseño y Construcción de Productos de Software', creditos: 3, prerrequisitos: ['3010440'] },
  { codigo: '3007848', nombre: 'Bases de Datos II', creditos: 3, prerrequisitos: ['3007847'] },
  { codigo: '3009430', nombre: 'Análisis y Diseño de Algoritmos', creditos: 3, prerrequisitos: ['3007741'] },
  { codigo: '3007871', nombre: 'Programación Matemática', creditos: 3, prerrequisitos: ['3007324'] },
  { codigo: '3007872', nombre: 'Sistemas Complejos', creditos: 3, prerrequisitos: ['3007331'] },
  { codigo: '3007325', nombre: 'Investigación de Operaciones II', creditos: 3, prerrequisitos: ['3007324'] },
  { codigo: '3007311', nombre: 'Dinámica de Sistemas', creditos: 3, prerrequisitos: ['3007331'] },
  { codigo: '3007873', nombre: 'Teoría de la Organización Industrial', creditos: 3, prerrequisitos: ['3007324'] },
  { codigo: '3007851', nombre: 'Gestión de Proyectos de Software', creditos: 3, prerrequisitos: ['3010440'] },
  { codigo: '3010836', nombre: 'Cátedra de Sistemas: una Visión Histórico-Cultural de la Computación', creditos: 2, prerrequisitos: ['3010438'] },
  { codigo: '3010757', nombre: 'Ciencias de la Computación y Aplicaciones Móviles', creditos: 3, prerrequisitos: ['3007847', '3007865'] },
  { codigo: '3010585', nombre: 'Introducción a la Creación de Videojuegos', creditos: 3, prerrequisitos: ['3007744'] },
  { codigo: '3009936', nombre: 'Seguridad Web', creditos: 3, prerrequisitos: ['3007741'] },
  { codigo: '3007202', nombre: 'Fundamentos de Economía', creditos: 3, prerrequisitos: [] },
  { codigo: '3010425', nombre: 'Teoría Administrativa y Organizacional', creditos: 3, prerrequisitos: [] },
  { codigo: '3010500', nombre: 'Gestión del Talento Humano', creditos: 3, prerrequisitos: ['3010425'] },
  { codigo: '3010524', nombre: 'Fundamentos de Mercadeo', creditos: 3, prerrequisitos: ['3010425'] },
  { codigo: '3007323', nombre: 'Investigación de Mercados', creditos: 3, prerrequisitos: ['3006915', '3010524'] },
  { codigo: '3007595', nombre: 'Redes Teleinformáticas I', creditos: 4, prerrequisitos: ['3007865'] },
  { codigo: '3007596', nombre: 'Redes Teleinformáticas II', creditos: 4, prerrequisitos: ['3007595'] },
  { codigo: '3007597', nombre: 'Redes Teleinformáticas III', creditos: 4, prerrequisitos: ['3007596'] },
  { codigo: '3008883', nombre: 'Fundamentos de Sistemas de Información e Inteligencia de Negocios', creditos: 3, prerrequisitos: ['3010435'] },
  { codigo: '3007854', nombre: 'Técnicas de Aprendizaje Estadístico', creditos: 3, prerrequisitos: ['3010476'] },
  { codigo: '3007860', nombre: 'Sistema de Recuperación de Información de Web', creditos: 3, prerrequisitos: ['3010476'] },
  { codigo: '3011021', nombre: 'Programación para Ingeniería', creditos: 3, prerrequisitos: ['1000003-M', '3010435'] },
  { codigo: '3011034', nombre: 'Servicios en la Nube', creditos: 3, prerrequisitos: ['3007847', '3007865'] },
  { codigo: '3011019', nombre: 'Desarrollo Web', creditos: 3, prerrequisitos: ['3007847', '3007865'] },
  { codigo: '3011018', nombre: 'Creación Multimedia', creditos: 3, prerrequisitos: ['3007744'] },
]

// Códigos que no existen (error del PDF) y deben excluirse por completo.
const CODIGOS_EXCLUIDOS = new Set(['3010414'])

// ─────────────────────────── Totales por componente (del PDF) ───────────────────────────

const COMPONENTES: Record<ComponenteId, ComponenteInfo> = {
  fundamentacion: { creditos_exigidos: 43, creditos_obligatorios: 27 },
  ciencias_computacion: { creditos_exigidos: 27, creditos_obligatorios: 27 },
  ingenieria_software: { creditos_exigidos: 9, creditos_obligatorios: 9 },
  sistemas: { creditos_exigidos: 11, creditos_obligatorios: 11 },
  proyectos_ingenieria: { creditos_exigidos: 10, creditos_obligatorios: 10 },
  optativas_tecnologicas: { creditos_exigidos: 22, creditos_obligatorios: 0 },
  trabajo_grado: { creditos_exigidos: 6, creditos_obligatorios: 6 },
  libre_eleccion: { creditos_exigidos: 33, creditos_obligatorios: 0 },
}

// ─────────────────────────── Parseo ───────────────────────────

function extraerTextoConLayout(): string {
  try {
    return execFileSync('pdftotext', ['-layout', PDF_PATH, '-'], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch {
    throw new Error(
      'No se pudo ejecutar `pdftotext`. Instala poppler-utils para usar el extractor.',
    )
  }
}

function normalizarNombre(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

function extraerCodigos(texto: string): string[] {
  const codigos = texto.match(CODE_RE) ?? []
  return [...new Set(codigos)]
}

interface FilaCruda {
  codigo: string
  nombre: string
  creditos: number
  obligatoria: boolean
  prerrequisitos: string[]
}

function parsearSeccion(lineas: string[], cfg: SeccionConfig): FilaCruda[] {
  const filas: FilaCruda[] = []
  let actual: FilaCruda | null = null
  let activa = false
  let creditoPendiente: number | null = null

  for (const linea of lineas) {
    if (!activa) {
      if (linea.includes(cfg.startMarker)) activa = true
      else continue
    }
    if (linea.includes(cfg.endMarker)) break
    if (linea.includes('CRÉDITOS:')) continue

    const segmentoCampos = linea.slice(cfg.codeCol, cfg.reqCol)
    const segmentoReq = linea.slice(cfg.reqCol, cfg.reqEnd)
    const match = segmentoCampos.match(ROW_RE)

    if (match) {
      const [, codigo, nombre, creditos, obligatoriaRaw] = match
      actual = {
        codigo,
        nombre: normalizarNombre(nombre),
        creditos: Number(creditos),
        obligatoria: /^si$/i.test(obligatoriaRaw),
        prerrequisitos: [],
      }
      filas.push(actual)
      actual.prerrequisitos.push(...extraerCodigos(segmentoReq))
      creditoPendiente = null
    } else {
      // Línea huérfana con solo el número de créditos (el PDF la separa de la fila).
      const soloCredito = segmentoCampos.trim().match(/^(\d)$/)
      if (soloCredito) {
        creditoPendiente = Number(soloCredito[1])
        continue
      }

      const matchSinCreditos = segmentoCampos.match(ROW_SIN_CREDITOS_RE)
      if (matchSinCreditos && creditoPendiente !== null) {
        const [, codigo, nombre, obligatoriaRaw] = matchSinCreditos
        actual = {
          codigo,
          nombre: normalizarNombre(nombre),
          creditos: creditoPendiente,
          obligatoria: /^si$/i.test(obligatoriaRaw),
          prerrequisitos: [],
        }
        filas.push(actual)
        actual.prerrequisitos.push(...extraerCodigos(segmentoReq))
        creditoPendiente = null
        continue
      }

      if (actual) {
        // Línea de continuación: puede aportar más nombre o más prerrequisitos.
        const textoCampos = normalizarNombre(
          segmentoCampos.replace(/\b(SI|Si|si)\b/g, ' '),
        )
        const pareceNombre =
          textoCampos.length > 0 &&
          !/\d/.test(textoCampos) &&
          !/Prerrequisito/i.test(textoCampos) &&
          !/Optativas/i.test(textoCampos) &&
          !/CONVENCIONES|Vicedecanatura|Sede Medellín/i.test(textoCampos)
        if (pareceNombre) {
          actual.nombre = normalizarNombre(`${actual.nombre} ${textoCampos}`)
        }
        actual.prerrequisitos.push(...extraerCodigos(segmentoReq))
      }
    }
  }

  return filas.map((f) => ({
    ...f,
    prerrequisitos: [...new Set(f.prerrequisitos)],
  }))
}

function parsearPorcentajes(lineas: string[]): Map<string, RequisitoPorcentaje[]> {
  const resultado = new Map<string, RequisitoPorcentaje[]>()
  const orden = ['3010408', '3010407', '3010439']
  let idx = 0

  for (const linea of lineas) {
    const m = linea.match(/(\d+)%\s+de\s+Avance en el Componente de\s+(.+)/i)
    if (!m) continue
    const porcentaje = Number(m[1])
    const componenteTexto = m[2].toLowerCase()
    const componente: ComponenteId = componenteTexto.includes('fundament')
      ? 'fundamentacion'
      : 'ciencias_computacion'
    const codigo = orden[Math.min(idx, orden.length - 1)]
    const previos = resultado.get(codigo) ?? []
    previos.push({ componente, porcentaje })
    resultado.set(codigo, previos)
    if (componente === 'fundamentacion' || porcentaje === 100) idx++
  }

  return resultado
}

// ─────────────────────────── Ensamblado ───────────────────────────

function construirPensum(): Pensum {
  const texto = extraerTextoConLayout()
  const todasLasLineas = texto.split('\n')

  // Parsear solo desde la sección AGRUPACIONES (evita la malla visual de la página 1).
  const idxInicio = todasLasLineas.findIndex((l) =>
    l.includes('a) Componente de Fundamentación'),
  )
  const lineas = idxInicio >= 0 ? todasLasLineas.slice(idxInicio) : todasLasLineas

  const asignaturas: Asignatura[] = []
  const vistos = new Set<string>()

  const agregar = (fila: FilaCruda, componente: ComponenteId, obligatoria: boolean) => {
    if (vistos.has(fila.codigo) || CODIGOS_EXCLUIDOS.has(fila.codigo)) return
    vistos.add(fila.codigo)
    const prerrequisitos = (PREREQ_OVERRIDES[fila.codigo] ?? fila.prerrequisitos).filter(
      (p) => p !== fila.codigo && !CODIGOS_EXCLUIDOS.has(p),
    )
    asignaturas.push({
      codigo: fila.codigo,
      nombre: NOMBRE_OVERRIDES[fila.codigo] ?? fila.nombre,
      alias: ALIAS[fila.codigo] ?? null,
      creditos: fila.creditos,
      obligatoria,
      semestre_en_plan: SEMESTRE_EN_PLAN[fila.codigo] ?? null,
      prerrequisitos: [...new Set(prerrequisitos)],
      agrupacion: componente,
      requisito_porcentaje: null,
      verificado: true,
      fuente_ref: `PDF AGRUPACIONES — ${componente}`,
    })
  }

  for (const cfg of SECCIONES) {
    const filas = parsearSeccion(lineas, cfg)
    for (const fila of filas) agregar(fila, cfg.componente, fila.obligatoria)
  }

  // Optativas de tecnologías: transcritas y verificadas manualmente.
  for (const o of OPTATIVAS) {
    agregar(
      {
        codigo: o.codigo,
        nombre: o.nombre,
        creditos: o.creditos,
        obligatoria: false,
        prerrequisitos: o.prerrequisitos,
      },
      'optativas_tecnologicas',
      false,
    )
  }

  // Trabajo de grado.
  const trabajoGrado = parsearTrabajoGrado(lineas)
  for (const fila of trabajoGrado) agregar(fila, 'trabajo_grado', true)

  // Porcentajes de los Seminarios.
  const porcentajes = parsearPorcentajes(lineas)
  for (const a of asignaturas) {
    const req = porcentajes.get(a.codigo)
    if (req) a.requisito_porcentaje = req.length === 1 ? req[0] : req
  }

  return {
    pensum_id: 'sistemas-minas-2024',
    programa: 'Ingeniería de Sistemas e Informática',
    facultad: 'Facultad de Minas',
    sede: 'Medellín',
    creditos_totales: 161,
    asignaturas: asignaturas.sort((a, b) => a.codigo.localeCompare(b.codigo)),
    componentes: COMPONENTES,
  }
}

function parsearTrabajoGrado(lineas: string[]): FilaCruda[] {
  const cfg: SeccionConfig = {
    componente: 'trabajo_grado',
    obligatoria: true,
    codeCol: 3,
    reqCol: 78,
    reqEnd: 400,
    startMarker: 'Trabajo de Grado',
    endMarker: 'CRÉDITOS: EXIGIDOS: 6',
  }
  return parsearSeccion(lineas, cfg)
}

// ─────────────────────────── Ejecución ───────────────────────────

const pensum = construirPensum()
mkdirSync(dirname(OUT_PATH), { recursive: true })
writeFileSync(OUT_PATH, `${JSON.stringify(pensum, null, 2)}\n`, 'utf8')

const obligatorias = pensum.asignaturas.filter((a) => a.obligatoria).length
console.log(`Pensum generado: ${OUT_PATH}`)
console.log(`Asignaturas: ${pensum.asignaturas.length} (obligatorias: ${obligatorias})`)
console.log('Revisa y marca `verificado` fila por fila contra el PDF.')