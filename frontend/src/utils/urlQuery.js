const DUMMY_BASE = 'http://_'

export function setUrlQueryParam(url, key, value) {
  try {
    const u = new URL(url, DUMMY_BASE)
    u.searchParams.set(key, value)
    return u.pathname + (u.search || '')
  } catch {
    return url
  }
}

export function urlHasParamValue(url, value) {
  if (!url || value == null || value === '') return false
  try {
    const u = new URL(url, DUMMY_BASE)
    for (const v of u.searchParams.values()) {
      if (v === String(value)) return true
    }
    return false
  } catch {
    return false
  }
}

export function resolveDependencies(url, formData) {
  if (!url) return url
  return url.replace(/\{(\w+)\}/g, (match, fieldName) => {
    const value = findFieldValue(formData, fieldName)
    return value == null ? '' : String(value)
  })
}

function findFieldValue(formData, fieldName) {
  for (const g of formData?.group_fields || []) {
    for (const f of g.fields || []) {
      if (f.field_name === fieldName) return f.columnValue
    }
  }
  return null
}

export function normalizeOptions(payload) {
  let p = payload
  if (p && typeof p === 'object') {
    if (p.data !== undefined) p = p.data
    else if (p.Data !== undefined) p = p.Data
  }
  let items = []
  if (Array.isArray(p)) items = p
  else if (Array.isArray(p?.data)) items = p.data
  else if (Array.isArray(p?.children)) items = p.children

  return items.map((it) => ({
    value: it.value ?? it.id ?? it.Oid ?? it.cd,
    label: it.label ?? it.name ?? it.text,
    isHtml: it.isHtml ?? false,
    htmlContent: it.isHtml ? (it.label ?? it.name ?? it.text) : null,
    raw: it,
  }))
}
