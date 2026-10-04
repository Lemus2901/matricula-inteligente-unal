import { useState } from 'react'
import { AlertCircle, FileText, X } from 'lucide-react'
import { parsearHistorialSIA } from '../core/pensum/parser-sia'
import type { FilaResumenSIA, HistorialItem, ParseResult, ParseError } from '../core/pensum/types'

interface HistoryImportProps {
  onImport: (items: HistorialItem[], resumen: FilaResumenSIA[]) => void
}

export function HistoryImport({ onImport }: HistoryImportProps) {
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)

  const handlePreview = () => {
    const resultado = parsearHistorialSIA(texto)
    setPreview(resultado)
    setPreviewVisible(true)
  }

  const handleConfirm = () => {
    if (preview && preview.items.length > 0) {
      onImport(preview.items, preview.resumen_creditos)
      setPreviewVisible(false)
    }
  }

  const handleCancel = () => {
    setPreviewVisible(false)
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Importar historial desde el SIA
        </h3>
        <p className="text-sm text-blue-700 mb-4">
          1. Abre el SIA → Consulta de historial académico
          <br />
          2. Selecciona todo (Ctrl+A) → Copia (Ctrl+C)
          <br />
          3. Pega aquí y haz clic en "Vista previa"
        </p>

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Pega aquí el texto copiado del SIA..."
          className="w-full min-h-[150px] p-3 border border-gray-300 rounded-lg font-mono text-sm resize-y"
          rows={10}
        />

        <div className="flex gap-2 mt-3">
          <button
            onClick={handlePreview}
            disabled={!texto.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Vista previa
          </button>
        </div>
      </div>

      {previewVisible && preview && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-semibold text-gray-800">
              Vista previa: {preview.items.length} asignaturas detectadas
            </h4>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {preview.errores.length > 0 && (
            <div className="bg-red-50 border-b border-red-200 p-3">
              <p className="text-sm text-red-800 font-medium mb-1">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                {preview.errores.length} línea(s) no reconocidas:
              </p>
              <ul className="text-sm text-red-700 max-h-24 overflow-auto">
                {preview.errores.map((e: ParseError, idx: number) => (
                  <li key={idx} className="font-mono truncate">{e.linea}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className="bg-yellow-50 border-b border-yellow-200 p-3">
              <p className="text-sm text-yellow-800 font-medium mb-1">Avisos:</p>
              <ul className="text-sm text-yellow-700">
                {preview.warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.resumen_creditos.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 p-3">
              <p className="text-sm text-blue-800 font-medium mb-1">
                Resumen de créditos detectado: {preview.resumen_creditos.length} fila(s)
              </p>
              <table className="w-full text-xs text-blue-900">
                <thead>
                  <tr className="text-left">
                    <th className="pr-2 font-medium">Tipología</th>
                    <th className="pr-2 font-medium text-right">Exig.</th>
                    <th className="pr-2 font-medium text-right">Apr.</th>
                    <th className="pr-2 font-medium text-right">Pend.</th>
                    <th className="pr-2 font-medium text-right">Insc.</th>
                    <th className="font-medium text-right">Curs.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.resumen_creditos.map((f: FilaResumenSIA, idx: number) => (
                    <tr key={idx} className="border-t border-blue-100">
                      <td className="pr-2">{f.tipologia}</td>
                      <td className="pr-2 text-right tabular-nums">{f.exigidos}</td>
                      <td className="pr-2 text-right tabular-nums">{f.aprobados}</td>
                      <td className="pr-2 text-right tabular-nums">{f.pendientes}</td>
                      <td className="pr-2 text-right tabular-nums">{f.inscritos}</td>
                      <td className="text-right tabular-nums">{f.cursados}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-600">Código</th>
                  <th className="text-left p-2 font-medium text-gray-600">Asignatura</th>
                  <th className="text-center p-2 font-medium text-gray-600 w-12">Estado</th>
                  <th className="text-center p-2 font-medium text-gray-600 w-16">Período</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item, idx) => (
                  <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-2 font-mono text-gray-700">{item.codigo}</td>
                    <td className="p-2 text-gray-700">{item.codigo} — (nombre del pensum)</td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.estado === 'aprobada'
                            ? 'bg-green-100 text-green-800'
                            : item.estado === 'en_curso'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.estado === 'aprobada' && '✓ Aprobada'}
                        {item.estado === 'en_curso' && '⏳ En curso'}
                        {item.estado === 'perdida' && '✗ Perdida'}
                      </span>
                    </td>
                    <td className="p-2 text-center text-gray-500 font-mono">
                      {item.periodo ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!preview || preview.items.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Confirmar e importar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}