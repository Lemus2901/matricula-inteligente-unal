interface ConflictToastProps {
  conflict: { mensaje: string; tipo: 'error' | 'warning' } | null
  onDismiss: () => void
}

export function ConflictToast({ conflict, onDismiss }: ConflictToastProps) {
  // Estado derivado en render (sin useState/useEffect): conflict decide todo.
  if (!conflict) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`flex items-start gap-3 p-4 rounded-lg shadow-lg min-w-[300px] max-w-md ${
        conflict.tipo === 'error'
          ? 'bg-red-50 border border-red-200 text-red-800'
          : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
      }`}>
        <div className="flex-shrink-0 mt-0.5">
          {conflict.tipo === 'error' ? (
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10.586 10l-3.293 3.293a1 1 0 001.414 1.414L10 11.414l3.293 3.293a1 1 0 001.414-1.414L11.414 10l3.293-3.293a1 1 0 00-1.414-1.414L10 8.586 6.707 5.293a1 1 0 00-1.414 1.414z" clipRule="evenodd"/></svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          )}
        </div>
        <div className="flex-1 ml-3">
          <p className="text-sm font-medium">{conflict.mensaje}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  )
}