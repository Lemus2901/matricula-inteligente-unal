import type {
  ComponenteId,
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
  while (i < lineas.length) {
    const linea = lineas[i]
    const match = linea.match(COURSE_RE)

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
          })
        }
      }

      i = j + 1
      continue
    }

    i++
  }

  return { items, errores, warnings }
}