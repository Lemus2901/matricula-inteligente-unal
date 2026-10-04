import type {
  ComponenteId,
  FilaResumenSIA,
  HistorialItem,
  ParseError,
  ParseResult,
} from './types'

/**
 * Parser del historial académico copiado del SIA (Portal de Servicios Académicos).
 *
 * Formato observado: cada asignatura ocupa dos líneas:
 *   NOMBRE (CODIGO)<tab>CRÉDITOS<tab>TIPO<tab>PERIODO<tab>CALIFICACIÓN
 *   ESTADO
 *
 * El parser es tolerante: acepta tabuladores o dos o más espacios y
 * omite el encabezado y el texto de navegación del portal.
 */

const COURSE_RE = /^(.*?)\s*\((\d{7}(?:-M)?)\)\s*(.*)$/
const ESTADOS = ['APROBADA', 'REPROBADA', 'CURSANDO', 'CANCELADA']

function normalizarEstado(raw: string): HistorialItem['estado'] | null {
  const r = raw.trim().toUpperCase()
  if (r.includes('APROBAD')) return 'aprobada'
  if (r.includes('REPROBAD') || r.includes('PERDIDA')) return 'perdida'
  if (r.includes('CURSANDO') || r.includes('EN CURSO')) return 'en_curso'
  if (r.includes('CANCELAD')) return 'perdida'
  return null
}

function esLineaEstado(linea: string): boolean {
  const l = linea.trim().toUpperCase()
  return ESTADOS.some((e) => l.startsWith(e))
}

/** Mapea la tipología del SIA a un componente del modelo (referencial). */
export function tipologiaAComponente(tipo: string): ComponenteId | null {
  const t = tipo.toUpperCase()
  if (t.includes('TRABAJO DE GRADO')) return 'trabajo_grado'
  if (t.includes('LIBRE')) return 'libre_eleccion'
  if (t.includes('DISCIPLINAR OPTATIVA')) return 'optativas_tecnologicas'
  if (t.includes('FUND')) return 'fundamentacion'
  if (t.includes('DISCIPLINAR')) return 'ciencias_computacion'
  return null
}

export function parsearHistorialSIA(texto: string): ParseResult {
  const lineas = texto.replace(/\r/g, '').split('\n')
  const items: HistorialItem[] = []
  const errores: ParseError[] = []
  const warnings: string[] = []
  const vistos = new Set<string>()

  let i = 0
  let resumen: FilaResumenSIA[] = []
  while (i < lineas.length) {
    const linea = lineas[i]
    const match = linea.match(COURSE_RE)

    // Bloque "Resumen de créditos" (solo la primera aparición).
    if (resumen.length === 0 && esTituloResumen(linea)) {
      resumen = extraerResumenCreditos(lineas, i)
    }

    if (match) {
      const [, nombreRaw, codigo, resto] = match
      const nombre = nombreRaw.replace(/\s+/g, ' ').trim()

      // Si el nombre está vacío, no es una asignatura.
      if (!nombre) {
        i++
        continue
      }

      const campos = resto.split(/\t|\s{2,}/).filter((c) => c.trim().length > 0)
      const creditos = Number(campos[0])
      const tipo = campos[1] ?? ''
      const periodo = campos[2] ?? ''

      // Buscar el estado en las siguientes líneas (hasta 2).
      let estado: HistorialItem['estado'] | null = null
      let j = i + 1
      while (j < lineas.length && j <= i + 2) {
        if (esLineaEstado(lineas[j])) {
          estado = normalizarEstado(lineas[j])
          break
        }
        if (lineas[j].trim() === '') {
          j++
          continue
        }
        break
      }

      const esNivelacion = tipo.toUpperCase().includes('NIVELACI')
      if (esNivelacion) {
        warnings.push(`Nivelación ignorada: ${nombre} (${codigo})`)
      } else if (estado === null) {
        errores.push({ linea, mensaje: `No se reconoció el estado de ${codigo}` })
      } else {
        const clave = `${codigo}|${estado}|${periodo}`
        if (!vistos.has(clave)) {
          vistos.add(clave)
          items.push({
            codigo,
            estado,
            periodo: periodo || undefined,
            creditos_inscritos: Number.isFinite(creditos) ? creditos : undefined,
            nombre_sia: nombre,
          })
        }
      }

      i = j + 1
      continue
    }

    i++
  }

  return { items, errores, warnings, resumen_creditos: resumen }
}

// ────────────── Resumen de créditos (tipologías del SIA) ──────────────

function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function esTituloResumen(linea: string): boolean {
  return normalizarTexto(linea) === 'resumen de creditos'
}

/**
 * Extrae las filas del bloque "Resumen de créditos" que sigue al listado de
 * asignaturas. Tolera dos variantes de copia del SIA:
 *  - encabezado celda-por-línea (con líneas de solo tabs intercaladas), y
 *  - encabezado en una sola línea separado por tabs.
 * Las filas de datos son `TIPOLOGÍA<TAB>exigidos<TAB>aprobados<TAB>pendientes<TAB>inscritos<TAB>cursados`.
 * Las líneas de excedentes, cancelados, porcentaje de avance y cupo quedan
 * fuera (no casan con el patrón y no se solicitaron).
 */
function extraerResumenCreditos(lineas: string[], desde: number): FilaResumenSIA[] {
  const filas: FilaResumenSIA[] = []
  const limite = Math.min(lineas.length, desde + 61)

  for (let i = desde + 1; i < limite; i++) {
    if (esTituloResumen(lineas[i])) break

    // O tolerancia: tabs (formato real) o dos o más espacios.
    let celdas = lineas[i].split('\t').map((c) => c.trim())
    if (celdas.length < 6) {
      celdas = lineas[i].split(/\s{2,}/).map((c) => c.trim())
    }
    celdas = celdas.filter((c) => c.length > 0)
    if (celdas.length < 6) continue

    const [tipologia, ...resto] = celdas
    const numeros = resto.slice(0, 5).map((c) => c.replace(/\./g, ''))
    if (!/^\d+$/.test(tipologia) && numeros.every((n) => /^\d+$/.test(n))) {
      filas.push({
        tipologia,
        exigidos: Number(numeros[0]),
        aprobados: Number(numeros[1]),
        pendientes: Number(numeros[2]),
        inscritos: Number(numeros[3]),
        cursados: Number(numeros[4]),
      })
    }
  }

  return filas
}