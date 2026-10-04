import { planificar } from '../core/algorithm/dp-planner'
import type { PlannerInput, RutaCompleta } from '../core/pensum/types'

/**
 * Ejecuta el motor de recomendación en un Web Worker para no bloquear la interfaz.
 * Si el entorno no soporta workers (p. ej. pruebas), cae al cálculo síncrono.
 */

let worker: Worker | null = null
let contador = 0
const pendientes = new Map<number, (ruta: RutaCompleta) => void>()

function obtenerWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (worker) return worker
  try {
    worker = new Worker(new URL('../workers/planner.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (evento: MessageEvent<{ id: number; ruta: RutaCompleta }>) => {
      const resolver = pendientes.get(evento.data.id)
      if (resolver) {
        pendientes.delete(evento.data.id)
        resolver(evento.data.ruta)
      }
    }
    return worker
  } catch {
    return null
  }
}

export function planificarAsync(input: PlannerInput): Promise<RutaCompleta> {
  const w = obtenerWorker()
  if (!w) {
    return Promise.resolve(planificar(input))
  }
  const id = ++contador
  return new Promise((resolve) => {
    pendientes.set(id, resolve)
    w.postMessage({ id, input })
  })
}