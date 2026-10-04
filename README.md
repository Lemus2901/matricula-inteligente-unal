# Matrícula Inteligente UNAL

Recomendador de materias para matricular en la Ingeniería de Sistemas e Informática (Facultad de Minas, Universidad Nacional): te dice **qué ver el próximo semestre**, por qué, y en cuántos semestres terminas. 100% en el navegador, sin backend ni cuentas.

## Qué hace

- **Importa tu historial del SIA** pegando el texto copiado del portal (vista previa editable) e incluye el bloque "Resumen de créditos" (7 tipologías) si viene en el texto.
- **Recomienda las próximas materias** respetando prerrequisitos y **cupos por tipología** (no te sugiere optativas cuando su cupo ya está cubierto).
- **Ruta por semestre** (greedy) con prioridad configurable: terminar rápido, cuidar el promedio o carga cómoda.
- **Cuellos de botella**: detecta las cadenas de materias que retrasan la graduación y el costo de evitarlas.
- **Simulación**: "¿y si pierdo esta?" muestra cuántos semestres te cuesta.
- **Avance por tipología**: tabla oficial del SIA arriba y el cálculo del motor abajo, agrupado bajo las mismas tipologías del SIA.
- **Explicable**: cada recomendación y cada bloqueo traen una razón legible.

## Stack

React + TypeScript + Vite · Zustand (estado) · Tailwind CSS v4 · Vitest (tests) · Web Worker (cálculo fuera del hilo) · localStorage (datos en tu navegador).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 23 pruebas unitarias (incluye fixture con historial real del SIA)
npm run build    # typecheck (tsc) + build de producción
```

## Datos y límites

- El pensum (`public/data/pensum-sistemas-minas.json`) se extrajo del **Programa Curricular oficial** y es la fuente de verdad de prerrequisitos y cupos; el resumen importado del SIA es informativo.
- Todo vive en tu navegador (localStorage); exporta/importa JSON para cambiar de equipo. Sin cuentas ni sincronización.
- v0.1: sin porcentajes de avance, PAPA ni cupo de créditos (ver roadmap en el spec).

## Documentación

Especificación técnica completa: [`DOCS/ESPECIFICACION-TECNICA.md`](DOCS/ESPECIFICACION-TECNICA.md) (requisitos, modelo de datos, algoritmos, plan de pruebas y trazabilidad).

## Estado

v0.1 en desarrollo. Pendiente: deploy en GitHub Pages y caso de estudio (roadmap tarea 11).
