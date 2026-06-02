import { createContext, useContext, useState, useCallback } from 'react'
import {
  AlertDialog, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback(({ title, description, confirmText = 'Xác nhận', cancelText = 'Hủy', variant = 'default' }) => {
    return new Promise((resolve) => {
      setState({ title, description, confirmText, cancelText, variant, resolve })
    })
  }, [])

  function handle(result) {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!state} onOpenChange={(v) => { if (!v) handle(false) }}>
        {state && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{state.title}</AlertDialogTitle>
              {state.description && (
                <AlertDialogDescription>{state.description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handle(false)}>{state.cancelText}</AlertDialogCancel>
              <AlertDialogAction
                variant={state.variant === 'destructive' ? 'destructive' : 'default'}
                onClick={() => handle(true)}
              >
                {state.confirmText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}
