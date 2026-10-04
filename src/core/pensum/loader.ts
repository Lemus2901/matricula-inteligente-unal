import { z } from 'zod'
import type { Pensum } from './types'

const COMPONENTES = [
  'fundamentacion',
  'ciencias_computacion',
  'ingenieria_software',
  'sistemas',
  'proyectos_ingenieria',
  'optativas_tecnologicas',
  'trabajo_grado',
  'libre_eleccion',
] as const

const componenteIdSchema = z.enum(COMPONENTES)

const requisitoPorcentajeSchema = z.object({
  componente: componenteIdSchema,
  porcentaje: z.number().min(0).max(100),
})

const asignaturaSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  alias: z.string().nullish(),
  creditos: z.number().int().positive(),
  obligatoria: z.boolean(),
  semestre_en_plan: z.number().int().positive().nullish(),
  prerrequisitos: z.array(z.string()),
  agrupacion: componenteIdSchema,
  requisito_porcentaje: z
    .union([requisitoPorcentajeSchema, z.array(requisitoPorcentajeSchema)])
    .nullish(),
  verificado: z.boolean(),
  fuente_ref: z.string(),
})

const componenteInfoSchema = z.object({
  creditos_exigidos: z.number().int().nonnegative(),
  creditos_obligatorios: z.number().int().nonnegative(),
})

export const pensumSchema = z.object({
  pensum_id: z.string().min(1),
  programa: z.string().min(1),
  facultad: z.string().min(1),
  sede: z.string().min(1),
  creditos_totales: z.number().int().positive(),
  asignaturas: z.array(asignaturaSchema).min(1),
  componentes: z.record(componenteIdSchema, componenteInfoSchema),
})

export interface CargaPensumResult {
  ok: boolean
  pensum?: Pensum
  errores: string[]
}

/** Valida y carga un objeto pensum sin lanzar excepciones. */
export function cargarPensum(data: unknown): CargaPensumResult {
  const parsed = pensumSchema.safeParse(data)
  if (!parsed.success) {
    return {
      ok: false,
      errores: parsed.error.issues.map(
        (i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`,
      ),
    }
  }
  return { ok: true, pensum: parsed.data as Pensum, errores: [] }
}

/** Carga un pensum desde una URL (p. ej. `/data/pensum-...json`). */
export async function cargarPensumDesdeUrl(url: string): Promise<CargaPensumResult> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { ok: false, errores: [`No se pudo cargar ${url} (HTTP ${res.status})`] }
    }
    const data: unknown = await res.json()
    return cargarPensum(data)
  } catch (e) {
    return { ok: false, errores: [`Error de red al cargar ${url}: ${String(e)}`] }
  }
}