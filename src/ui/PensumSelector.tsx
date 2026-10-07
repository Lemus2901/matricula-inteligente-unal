import { memo, useState } from 'react'
import { ChevronDown, CheckCircle, BookOpen } from 'lucide-react'
import type { Pensum } from '../core/pensum/types'

interface PensumSelectorProps {
  pensums: Pensum[]
  selectedPensumId: string
  onSelect: (id: string) => void
}

export const PensumSelector = memo(function PensumSelector({ pensums, selectedPensumId, onSelect }: PensumSelectorProps) {
  const [open, setOpen] = useState(false)

  if (pensums.length <= 1) {
    const p = pensums[0]
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{p.programa}</p>
              <p className="text-sm text-gray-500">{p.facultad} · {p.sede}</p>
            </div>
          </div>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 bg-white rounded-lg border border-gray-200 text-left hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-800">{pensums.find(p => p.pensum_id === selectedPensumId)?.programa ?? 'Seleccionar'}</p>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
        </div>
      </button>

      {pensums.length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
          {pensums.map((p) => (
            <button
              key={p.pensum_id}
              onClick={() => onSelect(p.pensum_id)}
              className={`w-full p-4 text-left hover:bg-blue-50 transition-colors ${
                selectedPensumId === p.pensum_id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{p.programa}</p>
                  <p className="text-sm text-gray-500">{p.facultad} · {p.sede}</p>
                </div>
                {selectedPensumId === p.pensum_id && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
})