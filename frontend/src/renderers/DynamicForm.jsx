import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import DynamicFilterField from './DynamicFilterField'
import { Label, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'

function flagOn(v) { return v === 1 || v === true }

function colClassToTailwind(c) {
  switch (c) {
    case 'col-2': return 'col-span-2'
    case 'col-3': return 'col-span-3'
    case 'col-4': return 'col-span-4'
    case 'col-6': return 'col-span-6'
    case 'col-12': return 'col-span-12'
    default: return 'col-span-12'
  }
}

const DynamicForm = forwardRef(function DynamicForm({ schema, isView = false, isFilter = false, onChange }, ref) {
  const [data, setData] = useState(schema)

  useEffect(() => { setData(schema) }, [schema])

  useImperativeHandle(ref, () => ({
    getFormData(_includeAll = true) {
      if (!data) return null
      const flat = {}
      for (const g of data.group_fields || []) {
        for (const f of g.fields || []) {
          if (flagOn(f.isIgnore)) continue
          flat[f.field_name] = f.columnValue
        }
      }
      return {
        tableKey: data.tableKey,
        groupKey: data.groupKey,
        group_fields: data.group_fields,
        fields: flat,
      }
    },
    resetForm() {
      const cleared = {
        ...data,
        group_fields: (data?.group_fields || []).map((g) => ({
          ...g,
          fields: (g.fields || []).map((f) => ({ ...f, columnValue: null })),
        })),
      }
      setData(cleared)
      onChange?.(cleared)
    },
    validateForm() {
      if (!data) return { isValid: false, errorFields: [] }
      const errors = []
      for (const g of data.group_fields || []) {
        for (const f of g.fields || []) {
          if (flagOn(f.isRequire) && !flagOn(f.isIgnore)) {
            if (f.columnValue == null || f.columnValue === '') errors.push(f.columnLabel)
          }
        }
      }
      return { isValid: errors.length === 0, errorFields: errors }
    },
  }), [data, onChange])

  if (!data) return null

  function handleFieldChange(groupIdx, fieldIdx, value) {
    const newGroups = data.group_fields.map((g, gi) => {
      if (gi !== groupIdx) return g
      return { ...g, fields: g.fields.map((f, fi) => fi === fieldIdx ? { ...f, columnValue: value } : f) }
    })
    const next = { ...data, group_fields: newGroups }
    setData(next)
    onChange?.(next)
  }

  return (
    <div className={cn(isFilter ? 'space-y-4' : 'space-y-5')}>
      {(data.group_fields || []).map((group, gi) => {
        const visibleFields = (group.fields || []).filter((f) => flagOn(f.isVisiable))
        if (visibleFields.length === 0) return null

        const fieldsGrid = (
          <div className="grid grid-cols-12 gap-4">
            {visibleFields.map((field) => {
              const realFi = group.fields.indexOf(field)
              return (
                <div key={field.field_name} className={cn('space-y-1.5', colClassToTailwind(field.columnClass))}>
                  <Label className="text-xs">
                    {field.columnLabel}
                    {!isFilter && flagOn(field.isRequire) && (
                      <span className="text-destructive ml-0.5">*</span>
                    )}
                  </Label>
                  <DynamicFilterField
                    field={isView ? { ...field, isDisable: 1 } : field}
                    value={field.columnValue}
                    onChange={(v) => handleFieldChange(gi, realFi, v)}
                    formData={data}
                  />
                </div>
              )
            })}
          </div>
        )

        if (isFilter) {
          return <div key={group.group_cd ?? gi}>{fieldsGrid}</div>
        }

        return (
          <Card key={group.group_cd ?? gi}>
            {group.group_name && (
              <CardHeader className="px-5 py-3 space-y-0 border-b">
                <CardTitle className="text-sm">{group.group_name}</CardTitle>
              </CardHeader>
            )}
            <CardContent className="p-5">
              {fieldsGrid}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
})

export default DynamicForm
