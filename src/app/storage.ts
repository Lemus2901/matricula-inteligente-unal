import type {
  FiltroMateria,
  HistorialAcademico,
  PerfilEstudiante,
} from '../core/pensum/types'

export const SCHEMA_VERSION = 1
const STORAGE_KEY = 'matricula-inteligente-unal'

export interface EstadoPersistido {
  schema_version: number
  pensum_id: string
  perfil: PerfilEstudiante
  historial: HistorialAcademico
  filtros: FiltroMateria[]
}

export function perfilInicial(pensumId: string): PerfilEstudiante {
  return {
    pensum_id: pensumId,
    prioridad: 'rapido',
  }
}

export function cargarEstado(): EstadoPersistido | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as EstadoPersistido
    if (data.schema_version !== SCHEMA_VERSION) {
      // En v0.1 no hay migraciones: se descarta el estado incompatible.
      return null
    }
    return data
  } catch {
    return null
  }
}

export function guardarEstado(estado: EstadoPersistido): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  } catch {
    // localStorage lleno o no disponible: se ignora silenciosamente en v0.1.
  }
}

export function limpiarEstado(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorar
  }
}

export function exportarJSON(estado: EstadoPersistido): string {
  return JSON.stringify(estado, null, 2)
}

export function importarJSON(texto: string): EstadoPersistido | null {
  try {
    const data = JSON.parse(texto) as EstadoPersistido
    if (typeof data !== 'object' || data === null) return null
    if (!Array.isArray(data.historial) || !Array.isArray(data.filtros)) return null
    return { ...data, schema_version: SCHEMA_VERSION }
  } catch {
    return null
  }
}