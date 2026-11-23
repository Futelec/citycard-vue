let cachedIP = null

const IP_APIS = [
  {
    url: 'https://api.ipify.org?format=json',
    extract: data => data.ip
  },
  {
    url: 'https://ipinfo.io/json',
    extract: data => data.ip
  },
  {
    url: 'https://httpbin.org/ip',
    extract: data => data.origin
  },
  {
    url: 'https://api.ip.sb/ip',
    extract: data => (typeof data === 'string' ? data.trim() : null)
  }
]

export async function getClientIP() {
  if (cachedIP) return cachedIP

  for (const api of IP_APIS) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(api.url, { signal: controller.signal })
      clearTimeout(timer)
      let data
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        data = await res.json()
      } else {
        data = await res.text()
      }
      const ip = api.extract(data)
      if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        cachedIP = ip
        console.log('[ClientIP] 获取公网IP成功:', ip, '(via', api.url, ')')
        return cachedIP
      }
    } catch {
      console.warn('[ClientIP] 获取IP失败:', api.url)
    }
  }

  console.error('[ClientIP] 所有IP服务均不可用')
  return null
}
