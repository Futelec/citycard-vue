/**
 * 邮件服务 — 调用 Resend API 发送邮件。
 *
 * 发送路径：
 *   1. 如果配置了 GFW 代理（Worker），走 Worker 的 /send-email 端点
 *   2. 否则走 Vite 开发代理 /api/resend/emails（仅开发环境）
 *
 * 生产环境需要部署 Cloudflare Worker 并配置代理地址。
 */

import { getWorkerBaseUrl } from './useAuthProxy'

// 验证码缓存：{ email -> { code, expires } }
const codeCache = new Map()

const CODE_LENGTH = 6
const CODE_TTL = 5 * 60 * 1000 // 5 分钟

/**
 * 生成数字验证码
 */
function generateCode() {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

/**
 * 通过 Worker 代理发送邮件
 */
async function sendViaWorker(workerUrl, apiKey, from, to, subject, html) {
  const res = await fetch(`${workerUrl}/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, from, to, subject, html })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Worker 发送失败 (${res.status}): ${body}`)
  }
  return res.json()
}

/**
 * 通过 Vite 开发代理直接调用 Resend API
 */
async function sendViaDirect(apiKey, from, to, subject, html) {
  const res = await fetch('/api/resend/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ from, to, subject, html })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`发送失败 (${res.status}): ${body}`)
  }
  return res.json()
}

/**
 * 发送邮件
 * @param {{ to: string, subject: string, html: string, purpose?: 'signup'|'login' }} options
 */
export async function sendEmail({ to, subject, html, purpose }) {
  const apiKey = import.meta.env.VITE_RESEND_API_KEY
  if (!apiKey || apiKey === 're_your_api_key_here') {
    throw new Error('请在 .env 文件中配置 VITE_RESEND_API_KEY')
  }

  const from = purpose === 'login'
    ? (import.meta.env.VITE_EMAIL_FROM_LOGIN || import.meta.env.VITE_EMAIL_FROM || 'onboarding@resend.dev')
    : (import.meta.env.VITE_EMAIL_FROM_SIGNUP || import.meta.env.VITE_EMAIL_FROM || 'onboarding@resend.dev')

  const workerUrl = getWorkerBaseUrl()

  // 优先走 Worker 代理
  if (workerUrl) {
    return sendViaWorker(workerUrl, apiKey, from, [to], subject, html)
  }

  // 回退：通过 Vite 开发代理（仅开发环境可用）
  return sendViaDirect(apiKey, from, [to], subject, html)
}

/**
 * 发送邮箱验证码
 * @param {string} email 目标邮箱
 * @param {'signup'|'login'} [purpose='signup'] 用途：注册或登录/重置密码
 * @returns {Promise<void>}
 */
export async function sendVerificationCode(email, purpose = 'signup') {
  const code = generateCode()

  await sendEmail({
    to: email,
    purpose,
    subject: '城与卡牌 — 邮箱验证码',
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#1a1f2e;color:#e0e8ff;border-radius:12px;">
        <h2 style="color:#f0c850;margin-top:0;">城与卡牌</h2>
        <p>您的邮箱验证码是：</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#f0c850;margin:20px 0;text-align:center;">${code}</div>
        <p style="color:#888;font-size:13px;">验证码 ${CODE_TTL / 60000} 分钟内有效，请勿泄露给他人。</p>
      </div>
    `
  })

  codeCache.set(email.toLowerCase(), {
    code,
    expires: Date.now() + CODE_TTL
  })
}

/**
 * 验证邮箱验证码
 * @param {string} email
 * @param {string} code
 * @returns {boolean}
 */
export function verifyCode(email, code) {
  const entry = codeCache.get(email.toLowerCase())
  if (!entry) return false
  if (Date.now() > entry.expires) {
    codeCache.delete(email.toLowerCase())
    return false
  }
  if (entry.code !== code) return false

  // 验证成功，清除缓存
  codeCache.delete(email.toLowerCase())
  return true
}
