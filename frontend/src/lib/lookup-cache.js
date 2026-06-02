import api from '@/services/api'

/**
 * In-memory cache cho lookup endpoints idempotent (bondType/status/couponFreq/issuer...).
 * - 1 URL = 1 Promise dùng chung → React StrictMode double mount hit cache lần 2.
 * - Failed request bị xóa khỏi cache để lần sau retry được.
 * - Trong cùng 1 session, lookup chỉ gọi 1 lần net thật. F5 trang sẽ reset cache.
 */
const cache = new Map() // url → Promise<responseData>

export function cachedGet(url) {
  if (cache.has(url)) return cache.get(url)
  const p = api.get(url)
    .then((r) => r.data)
    .catch((err) => { cache.delete(url); throw err })
  cache.set(url, p)
  return p
}

/** Vứt 1 entry hoặc clear toàn bộ (dùng khi cần force refresh sau mutation). */
export function invalidateLookup(urlOrPattern) {
  if (!urlOrPattern) { cache.clear(); return }
  for (const key of [...cache.keys()]) {
    if (key === urlOrPattern || key.includes(urlOrPattern)) cache.delete(key)
  }
}
