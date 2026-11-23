import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  signInWithCustomToken,
  RecaptchaVerifier,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  deleteUser,
  signOut
} from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { useAuthStore } from '../stores/authStore'
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
  allocateUid,
  isNicknameTaken,
  reserveNickname,
  releaseNickname,
  getLoginEmail,
  reserveEmail,
  isEmailBound,
  getEmailAuthEmail,
  getEmailUid,
  releaseEmail,
  ensureUidIndex
} from './useUserDB'
import { getWorkerBaseUrl, workerFetch } from './useAuthProxy'

// Firebase error code to Chinese message mapping
const ERROR_MESSAGES = {
  'auth/email-already-in-use': '该邮箱已被注册',
  'auth/weak-password': '密码强度不够（至少6位）',
  'auth/invalid-email': '邮箱格式不正确',
  'auth/user-not-found': '账号不存在',
  'auth/wrong-password': '密码错误',
  'auth/too-many-requests': '操作过于频繁，请稍后再试',
  'auth/invalid-phone-number': '手机号格式不正确',
  'auth/invalid-verification-code': '验证码错误',
  'auth/code-expired': '验证码已过期',
  'auth/missing-phone-number': '请输入手机号',
  'auth/configuration-not-found': '手机号登录未启用，请在 Firebase Console 中开启 Phone 提供方',
  'auth/captcha-check-failed': 'reCAPTCHA 验证失败，请刷新页面重试',
  'auth/quota-exceeded': '短信配额已用完，请稍后再试或使用邮箱登录',
  'auth/requires-recent-login': '需要重新验证身份，请输入当前密码',
  'auth/admin-restricted-operation': '此操作已被管理员限制',
  'auth/invalid-credential': '昵称或密码错误',
  'auth/network-request-failed': '网络连接失败：请检查网络，或确认代理 auth.citycard.fun 可访问',
  'auth/internal-error': '登录服务异常，请稍后重试'
}

function getErrorMessage(error) {
  return ERROR_MESSAGES[error.code] || error.message || '操作失败，请重试'
}

/**
 * Convert a nickname to a valid email-safe slug for guest placeholder emails.
 * Uses hex encoding of the UTF-8 bytes so any characters (Chinese, etc.) produce
 * a unique, deterministic, ASCII-safe slug.
 */
function nicknameToEmailSlug(nickname) {
  return Array.from(new TextEncoder().encode(nickname.toLowerCase()))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Legacy slug function (pre-hex era). Kept for backwards-compatible login
 * of accounts registered before the hex-encoding change.
 */
function legacyNicknameSlug(nickname) {
  return nickname.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_')
}

let recaptchaVerifier = null
let confirmationResult = null
let isRegistering = false // 防止注册期间 onAuthStateChanged 重复分配 UID

export function useAuthFunctions() {
  const authStore = useAuthStore()

  function getFirebaseAuth() {
    const apps = getApps()
    if (apps.length === 0) return null
    return getAuth(apps[0])
  }

  /**
   * Load profile from RTDB; if missing, auto-create one from Firebase Auth info.
   * Ensures every logged-in user has a valid RTDB profile.
   */
  async function ensureProfile(firebaseUser) {
    let profile = await getUserProfile(firebaseUser.uid)
    if (!profile) {
      // Profile missing — create one based on Firebase Auth info
      const customUid = await allocateUid()
      const nickname = firebaseUser.displayName || ''
      if (nickname) {
        try { await reserveNickname(nickname, firebaseUser.uid) } catch { /* already reserved */ }
      }
      await createUserProfile(firebaseUser.uid, {
        uid: customUid,
        nickname,
        isGuest: false,
        phoneNumber: '',
        email: ''
      })
      profile = await getUserProfile(firebaseUser.uid)
    }
    return profile
  }

  /**
   * Initialize auth state listener
   */
  function initAuthListener() {
    const auth = getFirebaseAuth()
    if (!auth) {
      authStore.setAuthReady(true)
      return
    }
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 注册流程中跳过 ensureProfile，避免重复分配 UID
        // registerWithEmail / registerAsGuest 会自行创建 profile 并调用 setUser
        if (isRegistering) {
          authStore.setAuthReady(true)
          return
        }
        try {
          const profile = await ensureProfile(user)
          authStore.setUser(user, profile)
        } catch (e) {
          // RTDB read failed — still set the Firebase user so they stay logged in
          console.warn('[Auth] 加载用户资料失败，使用基础信息:', e.message)
          authStore.setUser(user)
        }
      } else {
        authStore.setUser(null)
      }
      authStore.setAuthReady(true)
    })
  }

  /**
   * Register with email and password
   */
  async function registerWithEmail(email, password, nickname, phone) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    // Use provided email or generate a placeholder from phone number
    const authEmail = email || `${phone}@citycard.user`

    authStore.setLoading(true)
    isRegistering = true
    try {
      // Check email uniqueness in the index before creating Firebase account
      if (email && await isEmailBound(email)) {
        throw { code: 'custom', message: '该邮箱已被其他账号绑定' }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password)
      if (nickname) {
        await updateProfile(userCredential.user, { displayName: nickname })
      }

      // Allocate custom uid and create RTDB profile
      const customUid = await allocateUid()
      await reserveNickname(nickname, userCredential.user.uid, authEmail)
      // Reserve real email in email index (if provided)
      if (email) {
        await reserveEmail(email, userCredential.user.uid, authEmail)
      }
      await createUserProfile(userCredential.user.uid, {
        uid: customUid,
        nickname,
        isGuest: false,
        phoneNumber: phone || '',
        email: email || ''
      })
      await ensureUidIndex(customUid, userCredential.user.uid)

      const profile = await getUserProfile(userCredential.user.uid)
      authStore.setUser(userCredential.user, profile)
      // Store phone number in auth store for later use
      authStore.setPhone(phone)
      return userCredential.user
    } catch (error) {
      if (error.code === 'custom') throw new Error(error.message)
      throw new Error(getErrorMessage(error))
    } finally {
      isRegistering = false
      authStore.setLoading(false)
    }
  }

  /**
   * Login with email and password
   */
  async function loginWithEmail(email, password) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    authStore.setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const profile = await ensureProfile(userCredential.user)
      authStore.setUser(userCredential.user, profile)
      return userCredential.user
    } catch (error) {
      throw new Error(getErrorMessage(error))
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * Send password reset email
   */
  async function resetPassword(email) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Send phone SMS verification code
   */
  async function sendPhoneSmsCode(phoneNumber) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    try {
      // Create reCAPTCHA verifier if not exists
      if (!recaptchaVerifier) {
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        })
      }
      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
      return true
    } catch (error) {
      // Reset reCAPTCHA on failure
      recaptchaVerifier = null
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Confirm phone SMS verification code
   */
  async function confirmPhoneSmsCode(code) {
    if (!confirmationResult) throw new Error('请先获取验证码')

    authStore.setLoading(true)
    try {
      const result = await confirmationResult.confirm(code)
      authStore.setUser(result.user)
      return result.user
    } catch (error) {
      throw new Error(getErrorMessage(error))
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * Update user display name
   */
  async function updateDisplayName(name) {
    const auth = getFirebaseAuth()
    if (!auth || !auth.currentUser) throw new Error('未登录')

    try {
      await updateProfile(auth.currentUser, { displayName: name })
      authStore.setUser(auth.currentUser)
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Update email in RTDB.
   * Email verification is handled via code in the UI before calling this.
   * Firebase Auth email is NOT changed (placeholder stays); real email is in RTDB.
   * No password re-auth needed -- user is already logged in and email verified by code.
   */
  async function updateEmail(newEmail) {
    const auth = getFirebaseAuth()
    if (!auth || !auth.currentUser) throw new Error('未登录')

    try {
      // Check if the new email is already bound to another account
      if (await isEmailBound(newEmail, auth.currentUser.uid)) {
        throw { code: 'custom', message: '该邮箱已被其他账号绑定' }
      }

      const currentEmail = auth.currentUser.email

      // Release old email from index (if any)
      const oldProfile = await getUserProfile(auth.currentUser.uid)
      if (oldProfile?.email && oldProfile.email !== newEmail) {
        await releaseEmail(oldProfile.email)
      }

      // Reserve new email in index and update RTDB profile
      await reserveEmail(newEmail, auth.currentUser.uid, currentEmail)
      await updateUserProfile(auth.currentUser.uid, { email: newEmail })
      const profile = await getUserProfile(auth.currentUser.uid)
      authStore.setUser(auth.currentUser, profile)
    } catch (error) {
      if (error.code === 'custom') throw new Error(error.message)
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Register as guest with nickname and password
   * Uses a generated placeholder email for Firebase auth
   */
  async function registerAsGuest(nickname, password) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    authStore.setLoading(true)
    isRegistering = true
    try {
      // Final uniqueness check
      if (await isNicknameTaken(nickname)) {
        throw { code: 'custom', message: '该昵称已被使用' }
      }

      // Create Firebase account with placeholder email
      const guestEmail = `guest_${nicknameToEmailSlug(nickname)}@citycard.guest`
      const userCredential = await createUserWithEmailAndPassword(auth, guestEmail, password)
      await updateProfile(userCredential.user, { displayName: nickname })

      const customUid = await allocateUid()
      await reserveNickname(nickname, userCredential.user.uid, guestEmail)
      await createUserProfile(userCredential.user.uid, {
        uid: customUid,
        nickname,
        isGuest: true,
        phoneNumber: '',
        email: ''
      })

      const profile = await getUserProfile(userCredential.user.uid)
      authStore.setUser(userCredential.user, profile)
      return userCredential.user
    } catch (error) {
      if (error.code === 'custom') throw new Error(error.message)
      throw new Error(getErrorMessage(error))
    } finally {
      isRegistering = false
      authStore.setLoading(false)
    }
  }

  /**
   * Login with nickname and password (works for all account types).
   * Looks up the Firebase Auth email from the nickname index, then signs in.
   * Falls back to old guest placeholder email for legacy accounts.
   */
  async function loginWithNickname(nickname, password) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    authStore.setLoading(true)
    try {
      // 1. Try to get the stored auth email from the nickname index
      const storedEmail = await getLoginEmail(nickname)
      if (storedEmail) {
        const userCredential = await signInWithEmailAndPassword(auth, storedEmail, password)
        const profile = await ensureProfile(userCredential.user)
        authStore.setUser(userCredential.user, profile)
        return userCredential.user
      }

      // 2. Fallback: try old guest placeholder emails (for accounts registered before unified index)
      const guestEmail = `guest_${nicknameToEmailSlug(nickname)}@citycard.guest`
      try {
        const userCredential = await signInWithEmailAndPassword(auth, guestEmail, password)
        const profile = await ensureProfile(userCredential.user)
        authStore.setUser(userCredential.user, profile)
        // Backfill the nickname index with authEmail for future logins
        try { await reserveNickname(nickname, userCredential.user.uid, guestEmail) } catch { /* ignore */ }
        return userCredential.user
      } catch (firstError) {
        // 3. Try legacy slug for accounts registered before hex encoding
        const legacy = legacyNicknameSlug(nickname)
        const legacyEmail = `guest_${legacy}@citycard.guest`
        if (legacyEmail === guestEmail) throw firstError
        const userCredential = await signInWithEmailAndPassword(auth, legacyEmail, password)
        const profile = await ensureProfile(userCredential.user)
        authStore.setUser(userCredential.user, profile)
        // Backfill the nickname index
        try { await reserveNickname(nickname, userCredential.user.uid, legacyEmail) } catch { /* ignore */ }
        return userCredential.user
      }
    } catch (error) {
      throw new Error(getErrorMessage(error))
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * Upgrade guest account: link a real email, mark as non-guest
   */
  async function upgradeGuestAccount(newEmail, currentPassword, newPassword) {
    const auth = getFirebaseAuth()
    if (!auth || !auth.currentUser) throw new Error('未登录')

    authStore.setLoading(true)
    try {
      // Check if the email is already bound to another account
      if (await isEmailBound(newEmail, auth.currentUser.uid)) {
        throw { code: 'custom', message: '该邮箱已被其他账号绑定' }
      }

      // Re-authenticate with current placeholder email
      const currentEmail = auth.currentUser.email
      const oldCredential = EmailAuthProvider.credential(currentEmail, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, oldCredential)

      // Reserve email in index and update RTDB profile
      await reserveEmail(newEmail, auth.currentUser.uid, currentEmail)
      await updateUserProfile(auth.currentUser.uid, {
        isGuest: false,
        email: newEmail
      })

      const profile = await getUserProfile(auth.currentUser.uid)
      authStore.setUser(auth.currentUser, profile)
    } catch (error) {
      if (error.code === 'custom') throw new Error(error.message)
      throw new Error(getErrorMessage(error))
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * Set up a complete profile for a new phone-authenticated user.
   * Called after the nickname dialog in LoginView.
   */
  async function setupPhoneUserProfile(nickname, phoneNumber) {
    const auth = getFirebaseAuth()
    if (!auth || !auth.currentUser) throw new Error('未登录')

    try {
      if (await isNicknameTaken(nickname)) {
        throw { code: 'custom', message: '该昵称已被使用' }
      }

      const customUid = await allocateUid()
      await reserveNickname(nickname, auth.currentUser.uid)
      await updateProfile(auth.currentUser, { displayName: nickname })
      await createUserProfile(auth.currentUser.uid, {
        uid: customUid,
        nickname,
        isGuest: false,
        phoneNumber: phoneNumber || '',
        email: ''
      })

      const profile = await getUserProfile(auth.currentUser.uid)
      authStore.setUser(auth.currentUser, profile)
    } catch (error) {
      if (error.code === 'custom') throw new Error(error.message)
      throw new Error(getErrorMessage(error))
    }
  }

  /**
   * Send a login verification code to the email via the Worker.
   * Client looks up UID from RTDB email index and passes it to Worker,
   * so the Worker doesn't need RTDB access.
   */
  async function sendLoginCode(email) {
    const workerUrl = getWorkerBaseUrl()
    if (!workerUrl) throw new Error('代理未配置')

    // 客户端查找邮箱关联的 UID
    const uid = await getEmailUid(email)
    if (!uid) throw new Error('该邮箱未绑定任何账号')

    const apiKey = import.meta.env.VITE_RESEND_API_KEY || ''
    const from = import.meta.env.VITE_EMAIL_FROM_LOGIN || import.meta.env.VITE_EMAIL_FROM || ''
    const res = await workerFetch('/auth/send-login-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, uid, apiKey, from })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '验证码发送失败')
    }
    const data = await res.json().catch(() => ({}))
    // 无状态验证码令牌，校验时需带回（避免跨 isolate 丢失验证码）
    return data.codeToken || ''
  }

  /**
   * Login with email + verification code (passwordless).
   * The Worker verifies the code and returns a Firebase custom token.
   */
  async function loginWithEmailCode(email, code, codeToken) {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error('Firebase 未初始化')

    const workerUrl = getWorkerBaseUrl()
    if (!workerUrl) throw new Error('代理未配置')

    authStore.setLoading(true)
    try {
      // 1. Worker 验证码校验 + 签发 custom token
      const res = await workerFetch('/auth/verify-login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, codeToken })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '验证失败')
      }
      const { customToken } = await res.json()

      // 2. 用 custom token 登录 Firebase Auth
      const userCredential = await signInWithCustomToken(auth, customToken)
      const profile = await ensureProfile(userCredential.user)
      authStore.setUser(userCredential.user, profile)

      // 3. 回填邮箱索引（如果不存在）
      const storedAuthEmail = await getEmailAuthEmail(email)
      if (!storedAuthEmail) {
        try { await reserveEmail(email, userCredential.user.uid, userCredential.user.email || email) } catch { /* ignore */ }
      }

      return userCredential.user
    } catch (error) {
      if (error.code) throw new Error(getErrorMessage(error))
      throw error
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * Delete account permanently.
   * Cleans up RTDB data (nickname index, email index, user profile),
   * localStorage phone cache, and finally the Firebase Auth account.
   * Firebase Auth deletion must be last since it revokes RTDB permissions.
   * No password re-auth needed — user is already logged in.
   * If deleteUser requires recent login, user must re-login first.
   */
  async function deleteAccount() {
    const auth = getFirebaseAuth()
    if (!auth || !auth.currentUser) throw new Error('未登录')

    const currentUser = auth.currentUser
    const firebaseUid = currentUser.uid

    authStore.setLoading(true)
    try {
      // 1. Get current RTDB profile
      const profile = await getUserProfile(firebaseUid)

      // 2. Release nickname index
      if (profile?.nickname) {
        await releaseNickname(profile.nickname)
      }

      // 3. Release email index — check both profile.email and authStore.profileEmail
      const emailToRelease = profile?.email || authStore.user?.profileEmail
      if (emailToRelease) {
        await releaseEmail(emailToRelease)
      }

      // 4. Delete RTDB user profile
      await deleteUserProfile(firebaseUid)

      // 5. Clean up localStorage phone cache
      localStorage.removeItem(`citycard_phone_${firebaseUid}`)

      // 6. Delete Firebase Auth account (must be last — after this we lose RTDB access)
      await deleteUser(currentUser)

      // 7. Clear auth store
      authStore.clearUser()
    } catch (error) {
      throw new Error(getErrorMessage(error))
    } finally {
      authStore.setLoading(false)
    }
  }

  /**
   * Logout
   */
  async function logout() {
    const auth = getFirebaseAuth()
    if (!auth) return

    try {
      await signOut(auth)
      authStore.clearUser()
    } catch (error) {
      throw new Error(getErrorMessage(error))
    }
  }

  return {
    initAuthListener,
    registerWithEmail,
    loginWithEmail,
    resetPassword,
    sendPhoneSmsCode,
    confirmPhoneSmsCode,
    updateDisplayName,
    updateEmail,
    registerAsGuest,
    loginWithNickname,
    upgradeGuestAccount,
    setupPhoneUserProfile,
    sendLoginCode,
    loginWithEmailCode,
    deleteAccount,
    logout
  }
}
