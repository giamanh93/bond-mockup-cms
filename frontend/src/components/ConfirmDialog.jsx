import { createContext, useContext, useState, useCallback } from 'react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback(({ title, description, confirmText = 'Xác nhận', variant = 'default' }) => {
    return new Promise((resolve) => {
      setState({ title, description, confirmText, variant, resolve })
    })
  }, [])

  function handleClose(result) {
    state?.resolve(result)
    setState(null)
  }

  const btnClass = {
    default: 'btn-primary',
    destructive: 'btn-danger',
    warning: 'btn bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500',
  }[state?.variant || 'default']

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => handleClose(false)} />
          <div className="relative card p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-gray-900">{state.title}</h3>
            {state.description && <p className="text-sm text-gray-500">{state.description}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => handleClose(false)} className="btn-secondary">Hủy</button>
              <button onClick={() => handleClose(true)} className={btnClass}>{state.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
