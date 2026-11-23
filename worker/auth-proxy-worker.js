/**
 * Cloudflare Worker — Firebase Auth 反向代理 + 验证码登录
 *
 * 功能：
 *   1. 代理白名单内的 Google API 域名（绕 GFW）
 *   2. /send-email — 代理发送邮件到 Resend
 *   3. /auth/send-login-code — 生成登录验证码并发送到邮箱
 *   4. /auth/verify-login-code — 验证码校验 + 签发 Firebase custom token
 *
 * 环境变量 (wrangler.toml [vars]):
 *   FIREBASE_SA_EMAIL  — 服务账号邮箱
 *   FIREBASE_DB_URL    — RTDB 数据库地址
 *   EMAIL_FROM         — 发件人地址
 *
 * Secrets (wrangler secret put):
 *   FIREBASE_SA_KEY    — 服务账号私钥 (PEM)
 *   RESEND_API_KEY     — Resend API Key
 *
 * 部署：cd worker && npx wrangler deploy
 */

const ALLOWED_HOSTS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'city-card-game.firebaseapp.com',
  'apis.google.com',
  'www.googleapis.com'
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  // 用 * 覆盖 Firebase SDK 可能新增的自定义头，避免预检失败导致 network-request-failed
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
}

// ─── 验证码存储 ──────────────────────────────────────────────
const codeStore = new Map()
const CODE_TTL = 5 * 60 * 1000 // 5 分钟

function generateCode() {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 1000000).padStart(6, '0')
}

// ─── 无状态验证码令牌 ────────────────────────────────────────
// Cloudflare 同一 Worker 的多次请求可能落在不同 isolate，内存 Map 不共享，
// 会导致“刚收到验证码却提示已过期”。这里把 {email,uid,code,exp} 用
// AES-GCM 加密后返回给客户端，校验时再带回 Worker 解密，彻底不依赖内存。

function base64UrlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4))
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function getCodeKey(env) {
  const secret = env.LOGIN_CODE_SECRET || env.FIREBASE_SA_KEY || env.RESEND_API_KEY
  if (!secret) return null
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode('citycard-login-code:' + secret)
  )
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptCodeToken(payload, env) {
  const key = await getCodeKey(env)
  if (!key) return null
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return `${base64UrlEncode(iv)}.${base64UrlEncode(cipher)}`
}

async function decryptCodeToken(token, env) {
  const key = await getCodeKey(env)
  if (!key || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  try {
    const iv = base64UrlDecode(parts[0])
    const data = base64UrlDecode(parts[1])
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return JSON.parse(new TextDecoder().decode(plain))
  } catch {
    return null
  }
}

// ─── JWT / 加密工具 ──────────────────────────────────────────

function base64UrlEncode(input) {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importPrivateKey(pem) {
  const pemBody = pem
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/[\r\n\s]/g, '')
  const binaryStr = atob(pemBody)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  return crypto.subtle.importKey(
    'pkcs8', bytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
}

async function signJWT(payload, privateKeyPem) {
  const key = await importPrivateKey(privateKeyPem)
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const data = new TextEncoder().encode(`${header}.${body}`)
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, data)
  return `${header}.${body}.${base64UrlEncode(sig)}`
}

// ─── Google OAuth / Firebase ─────────────────────────────────

async function getGoogleAccessToken(saEmail, saKey) {
  const now = Math.floor(Date.now() / 1000)
  const jwt = await signJWT({
    iss: saEmail, sub: saEmail,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/identitytoolkit',
    iat: now, exp: now + 3600
  }, saKey)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('OAuth token exchange failed')
  return data.access_token
}

/** 通过 RTDB 邮箱索引 或 Firebase Auth 查找用户 UID */
async function lookupUidByEmail(email, dbUrl, accessToken) {
  // 1. 尝试 RTDB /emails/{key}
  const key = email.toLowerCase().replace(/\./g, ',')
  const dbRes = await fetch(`${dbUrl}/emails/${key}.json?access_token=${accessToken}`)
  if (dbRes.ok) {
    const data = await dbRes.json()
    if (data?.uid) return data.uid
  }
  // 2. 回退：Firebase Auth 按邮箱查找
  const authRes = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ email: [email] })
  })
  if (authRes.ok) {
    const authData = await authRes.json()
    if (authData.users?.[0]?.localId) return authData.users[0].localId
  }
  return null
}

async function createCustomToken(uid, saEmail, saKey) {
  const now = Math.floor(Date.now() / 1000)
  return signJWT({
    iss: saEmail, sub: saEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    uid, iat: now, exp: now + 3600
  }, saKey)
}

// ─── 响应工具 ────────────────────────────────────────────────

function jsonOk(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

function jsonErr(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

// ─── 路由处理 ────────────────────────────────────────────────

/**
 * 代理发送邮件到 Resend API
 * Body: { apiKey, from, to, subject, html }
 */
async function handleSendEmail(request) {
  if (request.method !== 'POST') {
    return jsonErr(405, 'Method not allowed')
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonErr(400, 'Invalid JSON')
  }

  const { apiKey, from, to, subject, html } = body
  if (!apiKey || !from || !to || !subject || !html) {
    return jsonErr(400, 'Missing required fields: apiKey, from, to, subject, html')
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ from, to, subject, html })
  })

  const resendBody = await resendRes.text()
  return new Response(resendBody, {
    status: resendRes.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  })
}

/**
 * 发送登录验证码
 * POST /auth/send-login-code { email, uid, apiKey?, from? }
 */
async function handleSendLoginCode(request, env) {
  if (request.method !== 'POST') return jsonErr(405, 'Method not allowed')

  let body
  try { body = await request.json() } catch { return jsonErr(400, 'Invalid JSON') }

  const { email, uid, apiKey: clientApiKey, from: clientFrom } = body
  if (!email) return jsonErr(400, 'Missing email')
  if (!uid) return jsonErr(400, '该邮箱未绑定任何账号')

  const code = generateCode()
  const expires = Date.now() + CODE_TTL
  // 无状态令牌（跨 isolate 可用），同时保留内存 Map 作为同 isolate 的兼容回退
  const codeToken = await encryptCodeToken({ email: email.toLowerCase(), uid, code, exp: expires }, env)
  codeStore.set(email.toLowerCase(), { code, uid, expires })

  const apiKey = env.RESEND_API_KEY || clientApiKey
  if (!apiKey) return jsonErr(500, 'Resend API key not configured')

  const from = clientFrom || env.EMAIL_FROM || 'login@email.citycard.fun'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from, to: [email],
      subject: '城与卡牌 — 登录验证码',
      html: `<div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#1a1f2e;color:#e0e8ff;border-radius:12px;">
        <h2 style="color:#f0c850;margin-top:0;">城与卡牌</h2>
        <p>您的登录验证码是：</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#f0c850;margin:20px 0;text-align:center;">${code}</div>
        <p style="color:#888;font-size:13px;">验证码 5 分钟内有效，请勿泄露给他人。</p>
      </div>`
    })
  })

  if (!res.ok) {
    const text = await res.text()
    return jsonErr(res.status, 'Email send failed: ' + text)
  }
  return jsonOk({ success: true, codeToken })
}

/**
 * 验证登录验证码，返回 Firebase custom token
 * POST /auth/verify-login-code { email, code }
 */
async function handleVerifyLoginCode(request, env) {
  if (request.method !== 'POST') return jsonErr(405, 'Method not allowed')

  let body
  try { body = await request.json() } catch { return jsonErr(400, 'Invalid JSON') }

  const { email, code, codeToken } = body
  if (!email || !code) return jsonErr(400, 'Missing email or code')

  const emailKey = email.toLowerCase()

  // 优先用前端带回的无状态令牌解密校验（跨 isolate 可靠）
  let entry = null
  if (codeToken) {
    const payload = await decryptCodeToken(codeToken, env)
    if (payload && payload.email === emailKey) {
      entry = { code: payload.code, uid: payload.uid, expires: payload.exp }
    }
  }
  // 兼容回退：同 isolate 的内存 Map
  if (!entry) entry = codeStore.get(emailKey)

  if (!entry) return jsonErr(400, '验证码不存在或已过期')
  if (Date.now() > entry.expires) {
    codeStore.delete(emailKey)
    return jsonErr(400, '验证码已过期')
  }
  if (entry.code !== String(code)) return jsonErr(400, '验证码错误')

  const uid = entry.uid
  codeStore.delete(emailKey)

  if (!uid) return jsonErr(400, '账号信息丢失，请重新发送验证码')

  // 签发 custom token
  const saEmail = env.FIREBASE_SA_EMAIL
  const saKey = env.FIREBASE_SA_KEY
  if (!saEmail || !saKey) {
    return jsonErr(500, 'Firebase service account not configured')
  }

  try {
    const customToken = await createCustomToken(uid, saEmail, saKey)
    return jsonOk({ customToken })
  } catch (e) {
    return jsonErr(500, e.message)
  }
}

// ─── 主入口 ──────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // /health 健康检查
    if (url.pathname === '/health') {
      return jsonOk({ status: 'ok' })
    }

    // /send-email 邮件发送
    if (url.pathname === '/send-email') {
      return handleSendEmail(request)
    }

    // /auth/send-login-code 发送登录验证码
    if (url.pathname === '/auth/send-login-code') {
      return handleSendLoginCode(request, env)
    }

    // /auth/verify-login-code 验证码登录
    if (url.pathname === '/auth/verify-login-code') {
      return handleVerifyLoginCode(request, env)
    }

    // Firebase Auth iframe/handler (authDomain=auth.citycard.fun)
    // Firebase SDK 从 authDomain 加载 /__/auth/iframe 和 /__/auth/handler
    if (url.pathname.startsWith('/__/')) {
      const targetUrl = `https://city-card-game.firebaseapp.com${url.pathname}${url.search}`
      const proxyReq = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
      })
      const resp = await fetch(proxyReq)
      const newHeaders = new Headers(resp.headers)
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        newHeaders.set(k, v)
      }
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: newHeaders
      })
    }

    // 从 path 中提取目标 host：/identitytoolkit.googleapis.com/v1/...
    const parts = url.pathname.split('/')
    const targetHost = parts[1]

    if (!targetHost || !ALLOWED_HOSTS.includes(targetHost)) {
      return jsonErr(403, 'Forbidden: host not in allowlist')
    }

    const targetPath = '/' + parts.slice(2).join('/')
    const targetUrl = `https://${targetHost}${targetPath}${url.search}`

    // 转发请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    })

    const response = await fetch(proxyRequest)

    // 添加 CORS 头返回
    const newHeaders = new Headers(response.headers)
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      newHeaders.set(key, value)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    })
  }
}
