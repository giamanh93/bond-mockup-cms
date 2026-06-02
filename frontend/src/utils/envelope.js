export function isOk(res) {
  if (!res || typeof res !== 'object') return false
  const s = String(res.status ?? '').toLowerCase()
  if (s === 'success') return true
  if (res.success === true) return true
  if (typeof res.Status === 'number' && res.Status >= 200 && res.Status < 300) return true
  if (typeof res.Status === 'string' && res.Status.toLowerCase() === 'success') return true
  return false
}

export function pickMessage(res, fallback = '') {
  if (!res || typeof res !== 'object') return fallback
  const a = typeof res.message === 'string' ? res.message.trim() : ''
  if (a) return a
  const b = typeof res.Message === 'string' ? res.Message.trim() : ''
  if (b) return b
  return fallback
}

export function pickData(res) {
  if (!res || typeof res !== 'object') return undefined
  return res.data ?? res.Data
}

export function extractAxiosMessage(err, fallback = 'Vui lòng thử lại') {
  const data = err?.response?.data
  const msg = (data?.message && String(data.message).trim()) || (data?.Message && String(data.Message).trim())
  if (msg) return msg
  if (err?.message) return err.message
  return fallback
}
