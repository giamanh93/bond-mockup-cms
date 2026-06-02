import { createContext, forwardRef, useContext, useId } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Controller, FormProvider, useFormContext } from 'react-hook-form'
import { Label } from './label'
import { cn } from '@/lib/utils'

const Form = FormProvider

const FormFieldContext = createContext({})

const FormField = ({ ...props }) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
)

const FormItemContext = createContext({})

function useFormField() {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()
  const fieldState = getFieldState(fieldContext.name, formState)
  if (!fieldContext) throw new Error('useFormField must be used within <FormField>')
  const { id } = itemContext
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

const FormItem = forwardRef(function FormItem({ className, ...props }, ref) {
  const id = useId()
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  )
})

const FormLabel = forwardRef(function FormLabel({ className, ...props }, ref) {
  const { error, formItemId } = useFormField()
  return (
    <Label
      ref={ref}
      className={cn(error && 'text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})

const FormControl = forwardRef(function FormControl({ ...props }, ref) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  )
})

const FormDescription = forwardRef(function FormDescription({ className, ...props }, ref) {
  const { formDescriptionId } = useFormField()
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
})

const FormMessage = forwardRef(function FormMessage({ className, children, ...props }, ref) {
  const { error, formMessageId } = useFormField()
  const body = error ? String(error?.message) : children
  if (!body) return null
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn('text-xs font-medium text-destructive', className)}
      {...props}
    >
      {body}
    </p>
  )
})

export {
  useFormField, Form, FormItem, FormLabel, FormControl,
  FormDescription, FormMessage, FormField,
}
