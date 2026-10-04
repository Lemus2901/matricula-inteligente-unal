import type { HistorialAcademico } from '../../src/core/pensum/types'

/**
 * Historial real de un estudiante de Ingeniería de Sistemas (UNAL),
 * tal como quedó parseado desde el texto copiado del SIA.
 *
 * Incluye 48 filas originales → 43 asignaturas parseadas (5 de nivelación
 * excluidas) y los dos duplicados reales:
 * - 1000005-M Cálculo Integral: perdida (2022-2S) y aprobada (2023-1S)
 * - 3010435 Fundamentos de Programación: perdida (2022-2S) y aprobada (2023-2S)
 *
 * El orden se preserva tal cual el SIA (más reciente primero).
 */
export const HISTORIAL_SIA_REAL: HistorialAcademico = [
  { codigo: '3009150', estado: 'aprobada', periodo: '2026-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3006927', estado: 'aprobada', periodo: '2026-1S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3010407', estado: 'aprobada', periodo: '2026-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3010415', estado: 'aprobada', periodo: '2026-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '2021514', estado: 'aprobada', periodo: '2026-1S Ordinaria', creditos_inscritos: 2 },
  { codigo: '3006931', estado: 'aprobada', periodo: '2025-2S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3010440', estado: 'aprobada', periodo: '2025-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3011020', estado: 'aprobada', periodo: '2025-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3010476', estado: 'aprobada', periodo: '2025-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007865', estado: 'aprobada', periodo: '2025-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007331', estado: 'aprobada', periodo: '2025-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3006915', estado: 'aprobada', periodo: '2025-1S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3007847', estado: 'aprobada', periodo: '2025-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007852', estado: 'aprobada', periodo: '2025-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007324', estado: 'aprobada', periodo: '2025-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007867', estado: 'aprobada', periodo: '2025-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '1000152-M', estado: 'aprobada', periodo: '2025-1S Ordinaria', creditos_inscritos: 2 },
  { codigo: '1000009-M', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007741', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007853', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3010426', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '2029656', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '2021152', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3011202', estado: 'aprobada', periodo: '2024-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3010651', estado: 'aprobada', periodo: '2024-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3006906', estado: 'aprobada', periodo: '2024-1S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3010408', estado: 'aprobada', periodo: '2024-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007744', estado: 'aprobada', periodo: '2024-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '1000019-M', estado: 'aprobada', periodo: '2023-2S Ordinaria', creditos_inscritos: 4 },
  { codigo: '1000007-M', estado: 'aprobada', periodo: '2023-2S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3010435', estado: 'aprobada', periodo: '2023-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3009065', estado: 'aprobada', periodo: '2023-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '1000003-M', estado: 'aprobada', periodo: '2023-1S Ordinaria', creditos_inscritos: 4 },
  { codigo: '1000005-M', estado: 'aprobada', periodo: '2023-1S Ordinaria', creditos_inscritos: 4 },
  { codigo: '1000005-M', estado: 'perdida', periodo: '2022-2S Ordinaria', creditos_inscritos: 4 },
  { codigo: '1000008-M', estado: 'aprobada', periodo: '2022-2S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3010435', estado: 'perdida', periodo: '2022-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3007202', estado: 'aprobada', periodo: '2022-1S Ordinaria', creditos_inscritos: 3 },
  { codigo: '1000004-M', estado: 'aprobada', periodo: '2022-1S Ordinaria', creditos_inscritos: 4 },
  { codigo: '3010438', estado: 'aprobada', periodo: '2021-2S Ordinaria', creditos_inscritos: 2 },
  { codigo: '3007373', estado: 'aprobada', periodo: '2021-2S Ordinaria', creditos_inscritos: 3 },
  { codigo: '3009511', estado: 'aprobada', periodo: '2021-2S Ordinaria', creditos_inscritos: 2 },
  { codigo: '1000089-M', estado: 'aprobada', periodo: '2021-2S Ordinaria', creditos_inscritos: 2 },
]
