/**
 * Auth Proxy — fetch 拦截器，将被 GFW 封锁的 Firebase Auth 域名
 * 重写到用户配置的 Cloudflare Worker 反向代理。
 *
 * 必须在 Firebase SDK 发出第一个请求前调用 enableAuthProxy()。
 */

const BLOCKED_HOSTS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  // Firebase SDK 会调用安装 ID 接口，不拦截同样会被墙
  'firebaseinstallations.googleapis.com',
  // Safari 会加载 auth iframe，如果不拦截会等 GFW 超时（~30s）
  'city-card-game.firebaseapp.com',
  'apis.google.com',
  'www.googleapis.com'
]

// 默认代理地址：使用自定义域名，避免 workers.dev 在中国大陆被封锁
const DEFAULT_PROXY_URL = 'https://auth.citycard.fun'

const STORAGE_KEY = 'auth_proxy_url'

let originalFetch = null
let proxyBaseUrl = null

/**
 * 判断 URL 是否命中被封锁的域名
 */
function isBlockedUrl(url) {
  try {
    const u = new URL(url)
    return BLOCKED_HOSTS.some(h => u.hostname === h)
  } catch {
    return false
  }
}

/**
 * 将 https://blocked-host/path 重写为代理地址
 * 开发模式：使用 /auth-proxy/ 相对路径，通过 Vite 代理转发，避免浏览器 DNS 问题
 * 生产模式：使用 proxyBaseUrl 绝对地址
 */
function rewriteUrl(url) {
  const u = new URL(url)
  if (import.meta.env.DEV) {
    return `/auth-proxy/${u.hostname}${u.pathname}${u.search}`
  }
  const base = proxyBaseUrl.replace(/\/+$/, '')
  return `${base}/${u.hostname}${u.pathname}${u.search}`
}

/**
 * 绝对代理地址（生产模式或开发模式回退时使用）
 */
function buildAbsoluteProxyUrl(url) {
  const u = new URL(url)
  const base = (proxyBaseUrl || DEFAULT_PROXY_URL).replace(/\/+$/, '')
  return `${base}/${u.hostname}${u.pathname}${u.search}`
}

/**
 * 带自动回退的 fetch：
 * 开发模式下先走 Vite 相对代理，若失败（中间件未生效、端口/隧道异常等），
 * 再回退到绝对代理地址，避免登录直接报 auth/network-request-failed。
 */
function proxiedFetch(targetUrl, init, originalUrl) {
  if (!import.meta.env.DEV) {
    return originalFetch.call(window, targetUrl, init)
  }
  return originalFetch.call(window, targetUrl, init).then(res => {
    // Vite 的 /auth-proxy 中间件未生效时会返回 404/405/5xx 或 HTML，
    // 这种情况下回退到绝对代理地址，避免登录报 auth/network-request-failed
    const type = res.headers.get('content-type') || ''
    const proxyBroken = res.status === 404 || res.status === 405 || res.status >= 500 || type.includes('text/html')
    if (proxyBroken) {
      const absoluteUrl = buildAbsoluteProxyUrl(originalUrl)
      console.warn('[AuthProxy] 相对代理异常，回退绝对地址:', res.status, type, absoluteUrl)
      return originalFetch.call(window, absoluteUrl, init)
    }
    return res
  }).catch(err => {
    const absoluteUrl = buildAbsoluteProxyUrl(originalUrl)
    console.warn('[AuthProxy] 相对代理请求失败，回退绝对地址:', absoluteUrl, err?.message || err)
    return originalFetch.call(window, absoluteUrl, init)
  })
}

/**
 * 安装 fetch 拦截器
 */
export function enableAuthProxy(url) {
  if (!url) return
  proxyBaseUrl = url

  // 避免重复 patch
  if (originalFetch) return
  originalFetch = window.fetch
  console.log('[AuthProxy] 代理已启用, 目标:', proxyBaseUrl)

  window.fetch = function patchedFetch(input, init) {
    // fetch(Request) 形式
    if (input instanceof Request) {
      if (isBlockedUrl(input.url)) {
        const newUrl = rewriteUrl(input.url)
        console.log('[AuthProxy] 拦截 Request:', input.url, '→', newUrl)
        const newRequest = new Request(newUrl, input)
        return originalFetch.call(window, newRequest, init)
      }
      return originalFetch.call(window, input, init)
    }

    // fetch(string, init) 形式
    if (typeof input === 'string' && isBlockedUrl(input)) {
      const newUrl = rewriteUrl(input)
      console.log('[AuthProxy] 拦截 string:', input, '→', newUrl)
      return proxiedFetch(newUrl, init, input)
    }

    return originalFetch.call(window, input, init)
  }

  // 同时拦截 XMLHttpRequest（部分 Firebase SDK 版本可能使用 XHR）
  const originalXHROpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && isBlockedUrl(url)) {
      const newUrl = rewriteUrl(url)
      console.log('[AuthProxy] 拦截 XHR:', url, '→', newUrl)
      return originalXHROpen.call(this, method, newUrl, ...args)
    }
    return originalXHROpen.call(this, method, url, ...args)
  }
}

/**
 * 恢复原始 fetch
 */
export function disableAuthProxy() {
  if (originalFetch) {
    window.fetch = originalFetch
    originalFetch = null
  }
  proxyBaseUrl = null
}

/**
 * 代理是否已启用
 */
export function isAuthProxyEnabled() {
  return originalFetch !== null && proxyBaseUrl !== null
}

/**
 * 获取代理地址：用户自定义 > 默认地址
 * 自动迁移旧的 workers.dev 地址到新的自定义域名
 */
export function loadAuthProxyUrl() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_PROXY_URL
    // 迁移：旧 workers.dev 地址已被墙，自动替换为新域名
    if (saved.includes('workers.dev')) {
      localStorage.removeItem(STORAGE_KEY)
      return DEFAULT_PROXY_URL
    }
    return saved
  } catch {
    return DEFAULT_PROXY_URL
  }
}

/**
 * 获取 Worker 基础 URL（用于直接调用 Worker 端点）
 * 开发模式返回相对路径 /auth-proxy，通过 Vite 代理转发
 * 生产模式返回实际代理地址
 */
export function getWorkerBaseUrl() {
  if (import.meta.env.DEV) {
    return '/auth-proxy'
  }
  return (loadAuthProxyUrl() || DEFAULT_PROXY_URL).replace(/\/+$/, '')
}

/**
 * 调用 Worker 自有端点（/auth/send-login-code、/auth/verify-login-code 等）。
 * 开发模式先走 Vite 相对代理；若代理转发失败（502/504/404）或网络异常，
 * 自动回退到绝对地址，避免出现 “fetch failed”。
 */
export async function workerFetch(path, init) {
  const p = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV) {
    try {
      const res = await fetch(`/auth-proxy${p}`, init)
      if (res.status !== 502 && res.status !== 504 && res.status !== 404 && res.status !== 405) {
        return res
      }
      console.warn('[AuthProxy] Worker 相对代理异常，回退绝对地址:', res.status, p)
    } catch (e) {
      console.warn('[AuthProxy] Worker 相对代理请求失败，回退绝对地址:', p, e?.message || e)
    }
  }
  const base = (loadAuthProxyUrl() || DEFAULT_PROXY_URL).replace(/\/+$/, '')
  return fetch(`${base}${p}`, init)
}

/**
 * 保存代理地址到 localStorage
 */
export function saveAuthProxyUrl(url) {
  try {
    if (url) {
      localStorage.setItem(STORAGE_KEY, url)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // localStorage 不可用时静默失败
  }
}

/**
 * 测试代理连通性，返回 { ok, latency, error }
 */
export async function testAuthProxy(url) {
  if (!url) return { ok: false, latency: 0, error: '请输入代理地址' }

  const base = url.replace(/\/+$/, '')
  const start = Date.now()

  try {
    const res = await fetch(`${base}/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    })
    const latency = Date.now() - start

    if (!res.ok) {
      return { ok: false, latency, error: `HTTP ${res.status}` }
    }

    const data = await res.json()
    if (data.status === 'ok') {
      return { ok: true, latency, error: null }
    }
    return { ok: false, latency, error: '代理响应异常' }
  } catch (e) {
    return { ok: false, latency: Date.now() - start, error: e.message || '连接失败' }
  }
}
