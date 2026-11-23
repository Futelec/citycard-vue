import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const AUTH_PROXY_TARGET = 'https://auth.citycard.fun'

/**
 * 自定义 Vite 插件：Firebase Auth 代理
 * 所有 /auth-proxy/* 请求通过 Node.js 转发到 Cloudflare Worker
 * 绕过浏览器 DNS/网络限制
 */
function authProxyPlugin() {
  return {
    name: 'auth-proxy',
    configureServer(server) {
      // 注意：不能用 async 函数，connect 中间件不支持 Promise
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/auth-proxy')) {
          return next()
        }

        console.log('[AuthProxy] 收到请求:', req.method, req.url.substring(0, 80))

        // 用 IIFE 处理异步逻辑，不返回 Promise 给 connect
        handleProxy(req, res).catch(err => {
          console.error('[AuthProxy] 未捕获错误:', err)
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('content-type', 'application/json')
            res.setHeader('access-control-allow-origin', '*')
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    }
  }
}

async function handleProxy(req, res) {
  const proxyPath = req.url.slice('/auth-proxy'.length) || '/'

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('access-control-allow-headers', '*')
    res.end()
    return
  }

  // 读取请求体
  let bodyBuffer = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    bodyBuffer = await new Promise((resolve, reject) => {
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => resolve(Buffer.concat(chunks)))
      req.on('error', reject)
    })
  }

  // 复制请求头
  const fwdHeaders = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (key !== 'host' && key !== 'connection') {
      fwdHeaders[key] = value
    }
  }

  // 全部走 Worker 代理（失败时自动重试一次，规避偶发 fetch failed）
  const workerUrl = AUTH_PROXY_TARGET + proxyPath
  const describeErr = (e) => e?.cause ? `${e.message} (${e.cause.code || e.cause.message || e.cause})` : e?.message
  let response
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(workerUrl, {
        method: req.method,
        headers: fwdHeaders,
        body: bodyBuffer,
      })
      console.log(`[AuthProxy] ✓ ${response.status} ${proxyPath.substring(0, 60)}`)
      break
    } catch (err) {
      if (attempt === 0) {
        console.warn(`[AuthProxy] 转发失败，重试一次: ${describeErr(err)}`)
        continue
      }
      console.error(`[AuthProxy] ✗ 失败: ${describeErr(err)}`)
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.setHeader('access-control-allow-origin', '*')
      res.end(JSON.stringify({ error: describeErr(err) }))
      return
    }
  }

  // 回写响应
  res.statusCode = response.status
  const skipHeaders = new Set(['transfer-encoding', 'content-encoding', 'content-length'])
  for (const [key, value] of response.headers) {
    if (!skipHeaders.has(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  }
  res.setHeader('access-control-allow-origin', '*')
  const buffer = Buffer.from(await response.arrayBuffer())
  res.setHeader('content-length', buffer.length)
  res.end(buffer)
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue(), authProxyPlugin()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.cpolar.top']
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    exclude: ['**/node_modules/**', '**/dist/**', 'archive/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/main.js',
        '**/*.spec.js',
        '**/*.test.js'
      ]
    }
  }
})
