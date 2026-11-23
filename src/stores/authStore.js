import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const authReady = ref(false)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const displayName = computed(() => user.value?.displayName || '')
  const uid = computed(() => user.value?.uid || '')
  const customUid = computed(() => user.value?.customUid ?? null)
  const avatar = computed(() => user.value?.avatar || '')
  const isGuest = computed(() => user.value?.isGuest || false)

  function setUser(firebaseUser, profile) {
    if (firebaseUser) {
      // 优先从 Firebase 获取手机号，其次从 localStorage 恢复
      const savedPhone = localStorage.getItem(`citycard_phone_${firebaseUser.uid}`) || ''
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        profileEmail: profile?.email ?? user.value?.profileEmail ?? '',
        displayName: firebaseUser.displayName || '',
        phoneNumber: profile?.phoneNumber || firebaseUser.phoneNumber || user.value?.phoneNumber || savedPhone,
        customUid: profile?.uid ?? user.value?.customUid ?? null,
        avatar: profile?.avatar ?? user.value?.avatar ?? '',
        isGuest: profile?.isGuest ?? user.value?.isGuest ?? false
      }
    } else {
      user.value = null
    }
  }

  function setCustomUid(uid) {
    if (user.value) {
      user.value.customUid = uid
    }
  }

  function setAvatar(av) {
    if (user.value) {
      user.value.avatar = av
    }
  }

  function setPhone(phoneNumber) {
    if (user.value) {
      user.value.phoneNumber = phoneNumber
      // 持久化到 localStorage
      localStorage.setItem(`citycard_phone_${user.value.uid}`, phoneNumber)
    }
  }

  function clearUser() {
    user.value = null
  }

  function setAuthReady(value) {
    authReady.value = value
  }

  function setLoading(value) {
    loading.value = value
  }

  return {
    user,
    authReady,
    loading,
    isLoggedIn,
    displayName,
    uid,
    customUid,
    avatar,
    isGuest,
    setUser,
    setCustomUid,
    setAvatar,
    setPhone,
    clearUser,
    setAuthReady,
    setLoading
  }
})
