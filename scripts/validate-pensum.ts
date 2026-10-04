/**
 * Valida el pensum generado: ciclos, prerrequisitos, coherencia de créditos.
 *
 * Uso:  npm run validate:pensum
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cargarPensum } from '../src/core/pensum/loader'
import { validarPensum } from '../src/core/pensum/validator'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_PATH = resolve(ROOT, 'public/data/pensum-sistemas-minas.json')

const data: unknown = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
const carga = cargarPensum(data)

if (!carga.ok || !carga.pensum) {
  console.error('El pensum no cumple el esquema:')
  for (const e of carga.errores) console.error('  -', e)
  process.exit(1)
}

const resultado = validarPensum(carga.pensum)

console.log(`Asignaturas: ${carga.pensum.asignaturas.length}`)
console.log(`Ciclos: ${resultado.niveles.size === carga.pensum.asignaturas.length ? 'no' : 'sí'}`)
console.log(`Errores: ${resultado.errores.length}`)
for (const e of resultado.errores) console.error('  ✗', e)
console.log(`Advertencias: ${resultado.advertencias.length}`)
for (const a of resultado.advertencias) console.warn('  ⚠', a)

if (!resultado.ok) process.exit(1)
console.log('Pensum válido.')