/// <reference lib="webworker" />
import { planificar } from '../core/algorithm/dp-planner'
import type { PlannerInput, RutaCompleta } from '../core/pensum/types'

interface Peticion {
  id: number
  input: PlannerInput
}

interface Respuesta {
  id: number
  ruta: RutaCompleta
  error?: string
}

self.onmessage = (evento: MessageEvent<Peticion>) => {
  const { id, input } = evento.data
  let respuesta: Respuesta
  try {
    respuesta = { id, ruta: planificar(input) }
  } catch (e) {
    respuesta = {
      id,
      ruta: {
        semestres: [],
        total_semestres: 0,
        proximas_materias: [],
        cuellos_botella: [],
        advertencias: [],
        bloqueo: { codigos: [], razon_texto: `Error al calcular: ${String(e)}` },
      },
      error: String(e),
    }
  }
  ;(self as unknown as Worker).postMessage(respuesta)
}

export {}