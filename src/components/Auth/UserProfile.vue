<template>
  <div class="auth-container">
    <div class="profile-form">
      <!-- Profile header -->
      <div class="profile-header">
        <div class="avatar-area" @click="showAvatarPicker = !showAvatarPicker">
          <div v-if="authStore.avatar && authStore.avatar.startsWith('data:')" class="avatar-circle img-avatar">
            <img :src="authStore.avatar" alt="avatar" />
          </div>
          <div v-else class="avatar-circle">
            {{ currentAvatarDisplay }}
          </div>
          <div class="avatar-edit-hint">更换头像</div>
        </div>
        <h2 class="profile-name">{{ authStore.displayName || '未设置昵称' }}</h2>
        <p v-if="authStore.customUid != null" class="profile-uid">UID: {{ authStore.customUid }}</p>
        <p class="profile-info">
          {{ displayContact }}
        </p>
        <span v-if="authStore.isGuest" class="guest-badge">游客</span>
      </div>

      <!-- Avatar picker -->
      <div v-if="showAvatarPicker" class="avatar-picker">
        <div class="avatar-picker-title">选择头像</div>
        <div class="avatar-grid">
          <button
            v-for="emoji in DEFAULT_AVATARS"
            :key="emoji"
            :class="['avatar-option', { selected: authStore.avatar === emoji }]"
            @click="selectAvatar(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
        <div class="avatar-upload-row">
          <button class="field-btn" @click="triggerFileUpload">上传自定义头像</button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleAvatarUpload"
          />
        </div>
      </div>

      <!-- Guest upgrade section -->
      <div v-if="authStore.isGuest" class="upgrade-section">
        <div class="upgrade-header">升级为正式账号</div>
        <div v-if="!showUpgradeForm" class="upgrade-hint">
          <p>绑定邮箱后可保留游戏数据</p>
          <button class="field-btn" @click="showUpgradeForm = true">升级账号</button>
        </div>
        <div v-else class="field-edit-col">
          <input
            v-model="upgradeCurrentPassword"
            type="password"
            class="edit-input"
            placeholder="请输入当前游客密码"
          />
          <div class="code-input-row">
            <input
              v-model="upgradeEmail"
              type="email"
              class="edit-input"
              placeholder="请输入邮箱地址"
            />
            <button
              v-if="upgradeEmail && isUpgradeEmailValid && !upgradeEmailVerified"
              class="field-btn"
              :disabled="upgradeCodeSending || upgradeCodeCountdown > 0"
              @click="handleSendUpgradeCode"
            >
              {{ upgradeCodeCountdown > 0 ? `${upgradeCodeCountdown}s` : (upgradeCodeSending ? '...' : '发送验证码') }}
            </button>
          </div>
          <div v-if="upgradeCodeSent && !upgradeEmailVerified" class="code-input-row">
            <input
              v-model="upgradeCode"
              type="text"
              class="edit-input"
              placeholder="请输入6位验证码"
              maxlength="6"
              @keyup.enter="handleVerifyUpgradeCode"
            />
            <button class="field-btn" :disabled="upgradeCode.length < 6" @click="handleVerifyUpgradeCode">验证</button>
          </div>
          <div v-if="upgradeEmailVerified" class="verify-pass">邮箱验证通过 ✓</div>
          <div class="field-edit-row">
            <button class="field-btn save" :disabled="upgradeLoading || !upgradeEmailVerified" @click="handleUpgrade">
              {{ upgradeLoading ? '升级中...' : '确认升级' }}
            </button>
            <button class="field-btn cancel" @click="cancelUpgrade">取消</button>
          </div>
        </div>
      </div>

      <!-- Profile fields -->
      <div class="profile-fields">
        <div class="field-row">
          <span class="field-label">昵称</span>
          <div v-if="!editMode" class="field-value-row">
            <span class="field-value">{{ authStore.displayName || '未设置' }}</span>
            <button class="field-btn" @click="startEdit">编辑</button>
          </div>
          <div v-else class="field-edit-col">
            <div class="field-edit-row">
              <input
                v-model="editedNickname"
                type="text"
                class="edit-input"
                placeholder="2-20个字符"
                maxlength="20"
                @keyup.enter="saveNickname"
              />
              <button class="field-btn save" :disabled="nicknameSaving" @click="saveNickname">保存</button>
              <button class="field-btn cancel" @click="cancelEdit">取消</button>
            </div>
            <span v-if="nicknameChecking" class="nickname-status checking">检查中...</span>
            <span v-else-if="nicknameAvailable === true" class="nickname-status available">昵称可用 ✓</span>
            <span v-else-if="nicknameAvailable === false" class="nickname-status taken">该昵称已被使用</span>
          </div>
        </div>

        <div class="field-row">
          <span class="field-label">手机号</span>
          <div v-if="authStore.user?.phoneNumber && !phoneEditMode" class="field-value-row">
            <span class="field-value">{{ authStore.user.phoneNumber }}</span>
            <div class="field-btn-group">
              <button class="field-btn" @click="startPhoneEdit">更换</button>
              <button class="field-btn cancel" @click="handleUnbindPhone">取消绑定</button>
            </div>
          </div>
          <div v-else-if="!phoneEditMode" class="field-value-row">
            <span class="field-value unset">未绑定</span>
            <button class="field-btn" @click="startPhoneEdit">绑定手机号</button>
          </div>
          <div v-else class="field-edit-row">
            <input
              v-model="editedPhone"
              type="tel"
              class="edit-input"
              placeholder="请输入11位手机号"
              maxlength="11"
              @keyup.enter="savePhone"
            />
            <button class="field-btn save" @click="savePhone">保存</button>
            <button class="field-btn cancel" @click="cancelPhoneEdit">取消</button>
          </div>
        </div>

        <div class="field-row">
          <span class="field-label">邮箱</span>
          <div v-if="realEmail && !emailEditMode" class="field-value-row">
            <span class="field-value">{{ realEmail }}</span>
            <div class="field-btn-group">
              <button class="field-btn" @click="startEmailEdit">更换</button>
              <button class="field-btn cancel" @click="handleUnbindEmail">取消绑定</button>
            </div>
          </div>
          <div v-else-if="!emailEditMode" class="field-value-row">
            <span class="field-value unset">未绑定</span>
            <button v-if="!authStore.isGuest" class="field-btn" @click="startEmailEdit">绑定邮箱</button>
          </div>
          <div v-else class="field-edit-col">
            <div class="code-input-row">
              <input
                v-model="editedEmail"
                type="email"
                class="edit-input"
                placeholder="请输入邮箱地址"
              />
              <button
                v-if="editedEmail && isEditedEmailValid && !emailCodeVerified"
                class="field-btn"
                :disabled="emailCodeSending || emailCodeCountdown > 0"
                @click="handleSendEmailCode"
              >
                {{ emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : (emailCodeSending ? '...' : '发送验证码') }}
              </button>
            </div>
            <div v-if="emailCodeSent && !emailCodeVerified" class="code-input-row">
              <input
                v-model="emailVerifyCode"
                type="text"
                class="edit-input"
                placeholder="请输入6位验证码"
                maxlength="6"
                @keyup.enter="handleVerifyEmailCode"
              />
              <button class="field-btn" :disabled="emailVerifyCode.length < 6" @click="handleVerifyEmailCode">验证</button>
            </div>
            <div v-if="emailCodeVerified" class="verify-pass">邮箱验证通过 ✓</div>
            <div class="field-edit-row">
              <button class="field-btn save" :disabled="emailLoading || !emailCodeVerified" @click="saveEmail">
                {{ emailLoading ? '保存中...' : '确认绑定' }}
              </button>
              <button class="field-btn cancel" @click="cancelEmailEdit">取消</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Messages -->
      <div v-if="errorMsg" class="message error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="message success">{{ successMsg }}</div>

      <!-- Actions -->
      <div class="profile-actions">
        <button class="action-btn back" @click="$emit('back')">返回主菜单</button>
        <button class="action-btn logout" :disabled="loading" @click="handleLogout">
          {{ loading ? '退出中...' : '退出登录' }}
        </button>
      </div>

      <!-- Danger zone: delete account -->
      <div class="danger-section">
        <div class="danger-header">危险区域</div>
        <div v-if="!showDeleteConfirm">
          <button class="action-btn danger" @click="showDeleteConfirm = true">注销账号</button>
        </div>
        <div v-else class="danger-confirm">
          <p class="danger-warning">注销后所有数据将被永久删除，无法恢复。</p>
          <div class="field-edit-row">
            <button class="action-btn danger" :disabled="deleteLoading" @click="handleDeleteAccount">
              {{ deleteLoading ? '注销中...' : '确认注销' }}
            </button>
            <button class="field-btn cancel" @click="showDeleteConfirm = false">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useAuthFunctions } from '../../composables/useAuth'
import {
  DEFAULT_AVATARS,
  isNicknameTaken,
  reserveNickname,
  releaseNickname,
  isEmailBound,
  releaseEmail,
  updateUserProfile
} from '../../composables/useUserDB'
import { sendVerificationCode, verifyCode } from '../../composables/useEmailService'

const emit = defineEmits(['back', 'logout'])

const authStore = useAuthStore()
const { updateDisplayName, updateEmail, upgradeGuestAccount, deleteAccount, logout } = useAuthFunctions()

const editMode = ref(false)
const editedNickname = ref('')
const nicknameAvailable = ref(null)
const nicknameChecking = ref(false)
const nicknameSaving = ref(false)
const phoneEditMode = ref(false)
const editedPhone = ref('')
const emailEditMode = ref(false)
const editedEmail = ref('')
const emailLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const loading = ref(false)
const showAvatarPicker = ref(false)
const fileInput = ref(null)
const showUpgradeForm = ref(false)
const upgradeEmail = ref('')
const upgradeCurrentPassword = ref('')
const upgradeLoading = ref(false)
const upgradeCode = ref('')
const upgradeCodeSent = ref(false)
const upgradeCodeSending = ref(false)
const upgradeCodeCountdown = ref(0)
const upgradeEmailVerified = ref(false)
let upgradeCountdownTimer = null

// Delete account
const showDeleteConfirm = ref(false)
const deleteLoading = ref(false)

// Email edit verification
const emailVerifyCode = ref('')
const emailCodeSent = ref(false)
const emailCodeSending = ref(false)
const emailCodeCountdown = ref(0)
const emailCodeVerified = ref(false)
let emailCountdownTimer = null

const currentAvatarDisplay = computed(() => {
  const av = authStore.avatar
  if (av && !av.startsWith('data:')) return av
  const name = authStore.displayName
  return name ? name.charAt(0).toUpperCase() : '?'
})

// 使用 RTDB 中存储的真实邮箱（profileEmail），而非 Firebase Auth 占位邮箱
const realEmail = computed(() => {
  return authStore.user?.profileEmail || ''
})

// 头部显示：优先手机号，其次真实邮箱
const displayContact = computed(() => {
  return authStore.user?.phoneNumber || realEmail.value || ''
})

const isUpgradeEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(upgradeEmail.value))
const isEditedEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedEmail.value))

// Reset verification state when email changes
watch(upgradeEmail, () => {
  upgradeEmailVerified.value = false
  upgradeCodeSent.value = false
  upgradeCode.value = ''
  upgradeCodeCountdown.value = 0
  if (upgradeCountdownTimer) { clearInterval(upgradeCountdownTimer); upgradeCountdownTimer = null }
})

watch(editedEmail, () => {
  emailCodeVerified.value = false
  emailCodeSent.value = false
  emailVerifyCode.value = ''
  emailCodeCountdown.value = 0
  if (emailCountdownTimer) { clearInterval(emailCountdownTimer); emailCountdownTimer = null }
})

// Nickname debounce check
let nicknameCheckTimer = null
watch(editedNickname, (val) => {
  nicknameAvailable.value = null
  if (nicknameCheckTimer) clearTimeout(nicknameCheckTimer)
  const trimmed = val.trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 20) return
  // If same as current name, mark as available
  if (trimmed === authStore.displayName) {
    nicknameAvailable.value = true
    return
  }
  nicknameChecking.value = true
  nicknameCheckTimer = setTimeout(async () => {
    try {
      const taken = await isNicknameTaken(trimmed)
      if (editedNickname.value.trim() === trimmed) {
        nicknameAvailable.value = !taken
      }
    } catch {
      nicknameAvailable.value = null
    } finally {
      if (editedNickname.value.trim() === trimmed) {
        nicknameChecking.value = false
      }
    }
  }, 300)
})

function startEdit() {
  editMode.value = true
  editedNickname.value = authStore.displayName || ''
  nicknameAvailable.value = true // current name is "available"
}

function cancelEdit() {
  editMode.value = false
  editedNickname.value = ''
  nicknameAvailable.value = null
}

async function saveNickname() {
  const trimmed = editedNickname.value.trim()
  if (trimmed.length < 2 || trimmed.length > 20) {
    errorMsg.value = '昵称长度需要在2-20个字符之间'
    return
  }
  errorMsg.value = ''
  successMsg.value = ''
  nicknameSaving.value = true
  try {
    const oldName = authStore.displayName
    if (trimmed !== oldName) {
      // Final uniqueness check
      const taken = await isNicknameTaken(trimmed)
      if (taken) {
        nicknameAvailable.value = false
        errorMsg.value = '该昵称已被使用'
        return
      }
      // Reserve new, release old
      await reserveNickname(trimmed, authStore.uid, authStore.user?.email || '')
      if (oldName) {
        await releaseNickname(oldName)
      }
      await updateUserProfile(authStore.uid, { nickname: trimmed })
    }
    await updateDisplayName(trimmed)
    editMode.value = false
    successMsg.value = '昵称已更新'
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    nicknameSaving.value = false
  }
}

async function selectAvatar(emoji) {
  errorMsg.value = ''
  successMsg.value = ''
  try {
    await updateUserProfile(authStore.uid, { avatar: emoji })
    authStore.setAvatar(emoji)
    showAvatarPicker.value = false
    successMsg.value = '头像已更新'
  } catch (e) {
    errorMsg.value = e.message
  }
}

function triggerFileUpload() {
  fileInput.value?.click()
}

/**
 * Compress an image file to a target max size via canvas.
 * Returns a base64 data URL (JPEG).
 */
function compressImage(file, maxSize = 100 * 1024, maxDim = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)

      let quality = 0.85
      let result = canvas.toDataURL('image/jpeg', quality)
      // Reduce quality until under maxSize
      while (result.length > maxSize * 1.37 && quality > 0.1) {
        quality -= 0.1
        result = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(result)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}

async function handleAvatarUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    errorMsg.value = '头像文件不能超过 2MB'
    return
  }

  errorMsg.value = ''
  successMsg.value = ''

  try {
    // Compress to ~100KB for RTDB storage
    const base64 = await compressImage(file)
    await updateUserProfile(authStore.uid, { avatar: base64 })
    authStore.setAvatar(base64)
    showAvatarPicker.value = false
    successMsg.value = '头像已更新'
  } catch (e) {
    errorMsg.value = '上传失败：' + e.message
  }

  // Reset file input
  event.target.value = ''
}

// --- Upgrade email verification code ---
async function handleSendUpgradeCode() {
  if (!upgradeEmail.value || !isUpgradeEmailValid.value) return
  upgradeCodeSending.value = true
  errorMsg.value = ''
  try {
    await sendVerificationCode(upgradeEmail.value, 'signup')
    upgradeCodeSent.value = true
    upgradeCodeCountdown.value = 60
    upgradeCountdownTimer = setInterval(() => {
      upgradeCodeCountdown.value--
      if (upgradeCodeCountdown.value <= 0) { clearInterval(upgradeCountdownTimer); upgradeCountdownTimer = null }
    }, 1000)
  } catch (e) {
    errorMsg.value = '验证码发送失败：' + e.message
  } finally {
    upgradeCodeSending.value = false
  }
}

function handleVerifyUpgradeCode() {
  if (verifyCode(upgradeEmail.value, upgradeCode.value)) {
    upgradeEmailVerified.value = true
    errorMsg.value = ''
  } else {
    errorMsg.value = '验证码错误或已过期'
  }
}

function cancelUpgrade() {
  showUpgradeForm.value = false
  upgradeEmailVerified.value = false
  upgradeCodeSent.value = false
  upgradeCode.value = ''
  upgradeCodeCountdown.value = 0
  if (upgradeCountdownTimer) { clearInterval(upgradeCountdownTimer); upgradeCountdownTimer = null }
}

async function handleUpgrade() {
  if (!upgradeCurrentPassword.value) {
    errorMsg.value = '请输入当前游客密码'
    return
  }
  if (!upgradeEmailVerified.value) {
    errorMsg.value = '请先完成邮箱验证'
    return
  }
  errorMsg.value = ''
  successMsg.value = ''
  upgradeLoading.value = true
  try {
    // Check uniqueness before upgrading
    if (await isEmailBound(upgradeEmail.value, authStore.uid)) {
      errorMsg.value = '该邮箱已被其他账号绑定'
      upgradeLoading.value = false
      return
    }
    await upgradeGuestAccount(upgradeEmail.value, upgradeCurrentPassword.value, upgradeCurrentPassword.value)
    showUpgradeForm.value = false
    upgradeEmailVerified.value = false
    successMsg.value = '账号升级成功，邮箱已绑定'
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    upgradeLoading.value = false
  }
}

// --- Email edit verification code ---
async function handleSendEmailCode() {
  if (!editedEmail.value || !isEditedEmailValid.value) return
  emailCodeSending.value = true
  errorMsg.value = ''
  try {
    // 先检查邮箱是否已被其他账号绑定
    if (await isEmailBound(editedEmail.value, authStore.uid)) {
      errorMsg.value = '该邮箱已被其他账号绑定'
      emailCodeSending.value = false
      return
    }
    await sendVerificationCode(editedEmail.value, 'login')
    emailCodeSent.value = true
    emailCodeCountdown.value = 60
    emailCountdownTimer = setInterval(() => {
      emailCodeCountdown.value--
      if (emailCodeCountdown.value <= 0) { clearInterval(emailCountdownTimer); emailCountdownTimer = null }
    }, 1000)
  } catch (e) {
    errorMsg.value = '验证码发送失败：' + e.message
  } finally {
    emailCodeSending.value = false
  }
}

function handleVerifyEmailCode() {
  if (verifyCode(editedEmail.value, emailVerifyCode.value)) {
    emailCodeVerified.value = true
    errorMsg.value = ''
  } else {
    errorMsg.value = '验证码错误或已过期'
  }
}

function startPhoneEdit() {
  phoneEditMode.value = true
  editedPhone.value = authStore.user?.phoneNumber || ''
}

function cancelPhoneEdit() {
  phoneEditMode.value = false
  editedPhone.value = ''
}

async function savePhone() {
  const trimmed = editedPhone.value.trim()
  if (!/^1[3-9]\d{9}$/.test(trimmed)) {
    errorMsg.value = '请输入有效的11位手机号'
    return
  }
  errorMsg.value = ''
  successMsg.value = ''
  try {
    await updateUserProfile(authStore.uid, { phoneNumber: trimmed })
    authStore.setPhone(trimmed)
    phoneEditMode.value = false
    successMsg.value = '手机号已更新'
  } catch (e) {
    errorMsg.value = '手机号保存失败：' + e.message
  }
}

function startEmailEdit() {
  emailEditMode.value = true
  editedEmail.value = realEmail.value || ''
}

function cancelEmailEdit() {
  emailEditMode.value = false
  editedEmail.value = ''
  emailCodeVerified.value = false
  emailCodeSent.value = false
  emailVerifyCode.value = ''
  emailCodeCountdown.value = 0
  if (emailCountdownTimer) { clearInterval(emailCountdownTimer); emailCountdownTimer = null }
}

async function saveEmail() {
  if (!emailCodeVerified.value) {
    errorMsg.value = '请先完成邮箱验证'
    return
  }
  const trimmed = editedEmail.value.trim()
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    errorMsg.value = '请输入有效的邮箱地址'
    return
  }
  errorMsg.value = ''
  successMsg.value = ''
  emailLoading.value = true
  try {
    await updateEmail(trimmed)
    emailEditMode.value = false
    emailCodeVerified.value = false
    successMsg.value = '邮箱已绑定成功'
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    emailLoading.value = false
  }
}

async function handleUnbindPhone() {
  errorMsg.value = ''
  successMsg.value = ''
  try {
    await updateUserProfile(authStore.uid, { phoneNumber: '' })
    authStore.setPhone('')
    localStorage.removeItem(`citycard_phone_${authStore.uid}`)
    successMsg.value = '手机号已解绑'
  } catch (e) {
    errorMsg.value = '解绑失败：' + e.message
  }
}

async function handleUnbindEmail() {
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const emailToRelease = realEmail.value
    if (emailToRelease) {
      await releaseEmail(emailToRelease)
    }
    await updateUserProfile(authStore.uid, { email: '' })
    if (authStore.user) {
      authStore.user.profileEmail = ''
    }
    successMsg.value = '邮箱已解绑'
  } catch (e) {
    errorMsg.value = '解绑失败：' + e.message
  }
}

async function handleDeleteAccount() {
  errorMsg.value = ''
  successMsg.value = ''
  deleteLoading.value = true
  try {
    await deleteAccount()
    emit('logout')
    emit('back')
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    deleteLoading.value = false
  }
}

async function handleLogout() {
  loading.value = true
  try {
    await logout()
    emit('logout')
    emit('back')
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

.profile-form {
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

.profile-header {
  text-align: center;
  margin-bottom: 32px;
}

.avatar-area {
  cursor: pointer;
  display: inline-block;
  position: relative;
}

.avatar-area:hover .avatar-edit-hint {
  opacity: 1;
}

.avatar-edit-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.avatar-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin: 0 auto 4px;
  box-shadow: 0 4px 16px rgba(212, 160, 23, 0.3);
  overflow: hidden;
  transition: transform 0.2s;
}

.avatar-area:hover .avatar-circle {
  transform: scale(1.05);
}

.avatar-circle.img-avatar {
  background: none;
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name {
  font-size: 24px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 4px 0;
}

.profile-uid {
  font-size: 13px;
  color: rgba(212, 160, 23, 0.7);
  margin: 0 0 4px 0;
  font-weight: 600;
}

.profile-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.guest-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 3px 12px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  color: #fbbf24;
  font-size: 12px;
  font-weight: 600;
}

/* Avatar picker */
.avatar-picker {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.avatar-picker-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.avatar-option {
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-option:hover {
  border-color: rgba(212, 160, 23, 0.4);
  background: rgba(212, 160, 23, 0.1);
}

.avatar-option.selected {
  border-color: #d4a017;
  background: rgba(212, 160, 23, 0.2);
  box-shadow: 0 0 8px rgba(212, 160, 23, 0.3);
}

.avatar-upload-row {
  text-align: center;
}

/* Upgrade section */
.upgrade-section {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.upgrade-header {
  font-size: 15px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 8px;
}

.upgrade-hint p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 10px 0;
}

.code-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.verify-pass {
  font-size: 12px;
  color: #34d399;
}

/* Nickname status */
.nickname-status {
  font-size: 12px;
  margin-top: 4px;
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

.profile-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.field-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.field-value {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
}

.field-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-btn-group {
  display: flex;
  gap: 6px;
}

.field-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-btn {
  padding: 6px 14px;
  border: 1px solid rgba(212, 160, 23, 0.3);
  border-radius: 6px;
  background: rgba(212, 160, 23, 0.1);
  color: #f0c850;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.field-btn:hover {
  background: rgba(212, 160, 23, 0.2);
}

.field-btn.save {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.field-btn.save:hover {
  background: rgba(52, 211, 153, 0.2);
}

.field-btn.cancel {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.5);
}

.field-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.08);
}

.field-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #e0e8ff;
  font-size: 15px;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.edit-input:focus {
  border-color: rgba(212, 160, 23, 0.5);
}

.field-value.unset {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.field-edit-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.message.error {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
}

.message.success {
  background: rgba(52, 211, 153, 0.12);
  border: 1px solid rgba(52, 211, 153, 0.3);
  color: #34d399;
}

.profile-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.back {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.action-btn.back:hover {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.logout {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
}

.action-btn.logout:hover {
  background: rgba(248, 113, 113, 0.2);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Danger zone */
.danger-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(248, 113, 113, 0.15);
}

.danger-header {
  font-size: 13px;
  font-weight: 700;
  color: rgba(248, 113, 113, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.danger-confirm {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.danger-warning {
  font-size: 13px;
  color: #f87171;
  margin: 0;
  line-height: 1.5;
}

.action-btn.danger {
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
  flex: none;
}

.action-btn.danger:hover {
  background: rgba(248, 113, 113, 0.25);
}

.action-btn.danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .profile-form {
    padding: 28px 20px;
  }

  .avatar-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
