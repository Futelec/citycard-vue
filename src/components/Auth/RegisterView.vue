<template>
  <div class="auth-container">
    <div class="auth-form">
      <button class="back-btn" @click="$emit('navigate', 'login')">← 返回登录</button>

      <div class="auth-header">
        <h2 class="register-title">创建账号</h2>
      </div>

      <div class="form-section">
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input
            v-model="nickname"
            type="text"
            class="form-input"
            placeholder="2-20个字符"
            maxlength="20"
          />
          <span v-if="nickname && (nickname.length < 2 || nickname.length > 20)" class="validation-hint">
            昵称长度需要在2-20个字符之间
          </span>
          <span v-else-if="nicknameChecking" class="nickname-status checking">检查中...</span>
          <span v-else-if="nickname.length >= 2 && nicknameAvailable === true" class="nickname-status available">昵称可用 ✓</span>
          <span v-else-if="nickname.length >= 2 && nicknameAvailable === false" class="nickname-status taken">该昵称已被使用</span>
        </div>

        <div class="form-group">
          <label class="form-label">手机号（选填）</label>
          <input
            v-model="phone"
            type="tel"
            class="form-input"
            placeholder="请输入手机号"
            maxlength="11"
          />
          <span v-if="phone && !isPhoneValid" class="validation-hint">
            请输入有效的11位手机号
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">邮箱地址（选填）</label>
          <div style="display: flex; gap: 8px;">
            <input
              v-model="email"
              type="email"
              class="form-input"
              placeholder="请输入邮箱"
              style="flex: 1;"
            />
            <button
              v-if="email && isEmailValid && !emailVerified"
              class="sms-btn"
              :disabled="emailCodeSending || emailCodeCountdown > 0"
              @click="handleSendEmailCode"
              style="flex-shrink: 0; width: auto; padding: 10px 14px; font-size: 13px;"
            >
              {{ emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : (emailCodeSending ? '发送中...' : '发送验证码') }}
            </button>
          </div>
          <span v-if="email && !isEmailValid" class="validation-hint">
            邮箱格式不正确
          </span>
          <span v-if="!phone && !email" class="guest-hint">
            不填手机号和邮箱将注册为游客账号
          </span>
        </div>

        <!-- 邮箱验证码输入 -->
        <div v-if="email && isEmailValid && emailCodeSent && !emailVerified" class="form-group">
          <label class="form-label">邮箱验证码</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input
              v-model="emailCode"
              type="text"
              class="form-input"
              placeholder="请输入6位验证码"
              maxlength="6"
              style="flex: 1;"
              @keyup.enter="handleVerifyEmailCode"
            />
            <button
              class="sms-btn"
              :disabled="emailCode.length < 6"
              @click="handleVerifyEmailCode"
              style="flex-shrink: 0; width: auto; padding: 10px 14px; font-size: 13px;"
            >
              验证
            </button>
          </div>
        </div>

        <div v-if="emailVerified" class="nickname-status available" style="margin-top: -8px;">
          邮箱验证通过 ✓
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="至少6位字符"
          />
          <div v-if="password" class="password-strength">
            <div
              class="strength-bar"
              :style="{ width: passwordStrength + '%', backgroundColor: strengthColor }"
            ></div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="form-input"
            placeholder="再次输入密码"
            @keyup.enter="handleRegister"
          />
          <span v-if="confirmPassword && password !== confirmPassword" class="validation-hint">
            两次输入的密码不一致
          </span>
        </div>

        <button
          class="auth-btn"
          :disabled="loading || !isFormValid"
          @click="handleRegister"
        >
          {{ loading ? '注册中...' : (isGuestRegister ? '创建游客账号' : '创建账号') }}
        </button>
      </div>

      <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>

      <div class="auth-links">
        <button class="link-btn" @click="$emit('navigate', 'login')">已有账号？登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthFunctions } from '../../composables/useAuth'
import { autoInitFirebase, isFirebaseReady } from '../../composables/useFirebase'
import { isNicknameTaken } from '../../composables/useUserDB'
import { sendVerificationCode, verifyCode } from '../../composables/useEmailService'

const emit = defineEmits(['navigate'])

// 进入注册页面时确保 Firebase 已初始化
onMounted(() => {
  if (!isFirebaseReady()) {
    autoInitFirebase()
  }
})

const { registerWithEmail, registerAsGuest } = useAuthFunctions()

const nickname = ref('')
const phone = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMsg = ref('')
const loading = ref(false)
const nicknameAvailable = ref(null) // null = unchecked, true = available, false = taken
const nicknameChecking = ref(false)

// 邮箱验证相关
const emailCode = ref('')
const emailCodeSent = ref(false)
const emailCodeSending = ref(false)
const emailCodeCountdown = ref(0)
const emailVerified = ref(false)
let emailCountdownTimer = null

// 邮箱变化时重置验证状态
watch(email, () => {
  emailVerified.value = false
  emailCodeSent.value = false
  emailCode.value = ''
  emailCodeCountdown.value = 0
  if (emailCountdownTimer) {
    clearInterval(emailCountdownTimer)
    emailCountdownTimer = null
  }
})

async function handleSendEmailCode() {
  if (!email.value || !isEmailValid.value) return
  emailCodeSending.value = true
  errorMsg.value = ''
  try {
    await sendVerificationCode(email.value)
    emailCodeSent.value = true
    emailCodeCountdown.value = 60
    emailCountdownTimer = setInterval(() => {
      emailCodeCountdown.value--
      if (emailCodeCountdown.value <= 0) {
        clearInterval(emailCountdownTimer)
        emailCountdownTimer = null
      }
    }, 1000)
  } catch (e) {
    errorMsg.value = '验证码发送失败：' + e.message
  } finally {
    emailCodeSending.value = false
  }
}

function handleVerifyEmailCode() {
  if (!emailCode.value || emailCode.value.length < 6) return
  if (verifyCode(email.value, emailCode.value)) {
    emailVerified.value = true
    errorMsg.value = ''
  } else {
    errorMsg.value = '验证码错误或已过期'
  }
}

let nicknameCheckTimer = null
watch(nickname, (val) => {
  nicknameAvailable.value = null
  if (nicknameCheckTimer) clearTimeout(nicknameCheckTimer)
  if (!val || val.length < 2 || val.length > 20) return
  nicknameChecking.value = true
  nicknameCheckTimer = setTimeout(async () => {
    try {
      const taken = await isNicknameTaken(val)
      // Only update if nickname hasn't changed during the async check
      if (nickname.value === val) {
        nicknameAvailable.value = !taken
      }
    } catch {
      nicknameAvailable.value = null
    } finally {
      if (nickname.value === val) {
        nicknameChecking.value = false
      }
    }
  }, 300)
})

const passwordStrength = computed(() => {
  const p = password.value
  if (!p) return 0
  let score = 0
  if (p.length >= 6) score += 25
  if (p.length >= 8) score += 15
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 20
  if (/\d/.test(p)) score += 20
  if (/[^a-zA-Z0-9]/.test(p)) score += 20
  return Math.min(100, score)
})

const strengthColor = computed(() => {
  const s = passwordStrength.value
  if (s < 30) return '#f87171'
  if (s < 60) return '#fbbf24'
  return '#34d399'
})

const isPhoneValid = computed(() => !phone.value || /^1[3-9]\d{9}$/.test(phone.value))

const isEmailValid = computed(() => !email.value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value))

const isGuestRegister = computed(() => !phone.value && !email.value)

const isFormValid = computed(() => {
  return nickname.value.length >= 2 &&
    nickname.value.length <= 20 &&
    nicknameAvailable.value === true &&
    isPhoneValid.value &&
    isEmailValid.value &&
    // 填了邮箱时必须完成邮箱验证
    (!email.value || emailVerified.value) &&
    password.value.length >= 6 &&
    password.value === confirmPassword.value
})

async function handleRegister() {
  if (!isFormValid.value) return
  errorMsg.value = ''
  loading.value = true
  try {
    // Final uniqueness check before registering
    const taken = await isNicknameTaken(nickname.value)
    if (taken) {
      nicknameAvailable.value = false
      errorMsg.value = '该昵称已被使用，请更换昵称'
      return
    }
    if (isGuestRegister.value) {
      await registerAsGuest(nickname.value, password.value)
    } else {
      await registerWithEmail(email.value || null, password.value, nickname.value, phone.value)
    }
    emit('navigate', 'menu')
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, #2a2340 0%, #1e2a4a 30%, #2a3a5c 60%, #3a2a4a 100%);
  padding: 20px;
}

.auth-form {
  width: 100%;
  max-width: 420px;
  background: rgba(20, 25, 40, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(212, 160, 23, 0.2);
  border-radius: 20px;
  padding: 40px 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.back-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
  transition: color 0.2s;
}

.back-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.register-title {
  font-size: 28px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #e0e8ff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: rgba(212, 160, 23, 0.5);
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.validation-hint {
  font-size: 12px;
  color: #f87171;
}

.nickname-status {
  font-size: 12px;
}

.nickname-status.checking {
  color: rgba(255, 255, 255, 0.5);
}

.nickname-status.available {
  color: #34d399;
}

.nickname-status.taken {
  color: #f87171;
}

.guest-hint {
  font-size: 12px;
  color: rgba(212, 160, 23, 0.7);
}

.password-strength {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s;
}

.auth-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(212, 160, 23, 0.3);
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 160, 23, 0.4);
}

.auth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message.error {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 12px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
}

.auth-links {
  text-align: center;
  margin-top: 20px;
}

.link-btn {
  background: none;
  border: none;
  color: rgba(212, 160, 23, 0.7);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.2s;
}

.link-btn:hover {
  color: #f0c850;
}

.sms-btn {
  padding: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.15));
  border: 1px solid rgba(59, 130, 246, 0.4);
  border-radius: 10px;
  color: #93c5fd;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.sms-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(59, 130, 246, 0.2));
}

.sms-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .auth-form {
    padding: 28px 20px;
  }
}
</style>
