/**
 * Runtime config loader — fetch /config/runtime.json TRƯỚC khi render React.
 * Fallback xuống VITE_* env nếu không có file (dev mode chưa đặt file).
 *
 * Cách dùng:
 *   1. main.jsx gọi `await loadRuntime()` rồi mới ReactDOM.createRoot().render()
 *   2. Module khác dùng `getRuntime()` — luôn trả config đã load
 */

let _runtime = null
let _loading = null

async function fetchRuntimeJson() {
  // Dev mode: bypass runtime.json để .env.development / .env.api driven 2 mode (mockup vs api).
  // Force load file bằng query string `?runtime=1` để test.
  const forceRuntime = new URLSearchParams(window.location.search).has('runtime')
  if (import.meta.env.DEV && !forceRuntime) return null
  try {
    const res = await fetch('/config/runtime.json', { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    delete json.$comment
    return json
  } catch {
    return null
  }
}

function resolveFromEnv() {
  return {
    apiUrl: import.meta.env.VITE_API_URL,
    appName: import.meta.env.VITE_APP_NAME,
    buildTag: import.meta.env.VITE_BUILD_TAG,
    oidc: {
      issuer: import.meta.env.VITE_OIDC_ISSUER,
      clientId: import.meta.env.VITE_OIDC_CLIENT_ID,
      scope: import.meta.env.VITE_OIDC_SCOPE || 'openid profile',
    },
    menu: null,
  }
}

function merge(file, env) {
  if (!file) return env
  return {
    apiUrl:   file.apiUrl   ?? env.apiUrl,
    appName:  file.appName  ?? env.appName,
    buildTag: file.buildTag ?? env.buildTag,
    oidc: {
      issuer:   file.oidc?.issuer   ?? env.oidc.issuer,
      clientId: file.oidc?.clientId ?? env.oidc.clientId,
      scope:    file.oidc?.scope    ?? env.oidc.scope,
    },
    menu: file.menu ?? env.menu,
  }
}

export function loadRuntime() {
  if (_runtime) return Promise.resolve(_runtime)
  if (_loading) return _loading
  _loading = fetchRuntimeJson().then((file) => {
    _runtime = merge(file, resolveFromEnv())
    return _runtime
  })
  return _loading
}

export function getRuntime() {
  if (!_runtime) throw new Error('Runtime chưa load. main.jsx phải await loadRuntime() trước khi render.')
  return _runtime
}
