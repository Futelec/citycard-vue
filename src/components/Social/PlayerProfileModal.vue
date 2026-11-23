<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">玩家主页</h2>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div v-if="player" class="profile-body">
          <!-- Avatar + basic info -->
          <div class="profile-top">
            <span v-if="player.avatar && player.avatar.startsWith('data:')" class="profile-avatar img">
              <img :src="player.avatar" alt="avatar" />
            </span>
            <span v-else class="profile-avatar">{{ player.avatar || player.nickname?.charAt(0) || '?' }}</span>
            <div class="profile-name">{{ player.nickname }}</div>
            <div class="profile-uid">UID: {{ player.customUid }}</div>
          </div>

          <!-- Stats panel -->
          <div class="stats-panel">
            <div class="stat-item">
              <span class="stat-value">{{ player.total }}</span>
              <span class="stat-label">总场次</span>
            </div>
            <div class="stat-item wins">
              <span class="stat-value">{{ player.wins }}</span>
              <span class="stat-label">胜利</span>
            </div>
            <div class="stat-item losses">
              <span class="stat-value">{{ player.losses }}</span>
              <span class="stat-label">失败</span>
            </div>
            <div class="stat-item winrate">
              <span class="stat-value">{{ player.winRate }}%</span>
              <span class="stat-label">胜率</span>
            </div>
          </div>

          <!-- Social counts -->
          <div class="social-counts">
            <div class="social-item" @click="openFollowList('followers')">
              <span class="social-value">{{ currentFollowersCount }}</span>
              <span class="social-label">粉丝</span>
            </div>
            <div class="social-item" @click="openFollowList('following')">
              <span class="social-value">{{ currentFollowingCount }}</span>
              <span class="social-label">关注</span>
            </div>
          </div>

          <!-- Follow/Unfollow button -->
          <div v-if="showFollowBtn" class="follow-actions">
            <button
              v-if="!following"
              class="follow-btn do-follow"
              :disabled="followLoading"
              @click="doFollow"
            >
              {{ followLoading ? '处理中...' : '关注' }}
            </button>
            <button
              v-else
              class="follow-btn do-unfollow"
              :disabled="followLoading"
              @click="doUnfollow"
            >
              {{ followLoading ? '处理中...' : '已关注' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { followUser, unfollowUser, isFollowing as checkFollowing } from '../../composables/useFollow'

const props = defineProps({
  modelValue: Boolean,
  player: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'open-follow-list', 'follow-changed'])

const authStore = useAuthStore()
const following = ref(false)
const followLoading = ref(false)
const currentFollowersCount = ref(0)
const currentFollowingCount = ref(0)

const showFollowBtn = computed(() => {
  if (!authStore.isLoggedIn || !props.player) return false
  return authStore.uid !== props.player.firebaseUid
})

watch(() => props.modelValue, async (visible) => {
  if (visible && props.player) {
    currentFollowersCount.value = props.player.followersCount || 0
    currentFollowingCount.value = props.player.followingCount || 0
    if (authStore.isLoggedIn && authStore.uid !== props.player.firebaseUid) {
      following.value = await checkFollowing(authStore.uid, props.player.firebaseUid)
    } else {
      following.value = false
    }
  }
})

function close() {
  emit('update:modelValue', false)
}

async function doFollow() {
  if (!props.player) return
  followLoading.value = true
  try {
    await followUser(authStore.uid, props.player.firebaseUid)
    following.value = true
    currentFollowersCount.value++
    emit('follow-changed')
  } catch (e) {
    console.warn('[Follow]', e.message)
  } finally {
    followLoading.value = false
  }
}

async function doUnfollow() {
  if (!props.player) return
  followLoading.value = true
  try {
    await unfollowUser(authStore.uid, props.player.firebaseUid)
    following.value = false
    currentFollowersCount.value = Math.max(currentFollowersCount.value - 1, 0)
    emit('follow-changed')
  } catch (e) {
    console.warn('[Unfollow]', e.message)
  } finally {
    followLoading.value = false
  }
}

function openFollowList(type) {
  if (!props.player) return
  emit('open-follow-list', { type, firebaseUid: props.player.firebaseUid })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1003;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: linear-gradient(135deg, #1e2a4a 0%, #2a2340 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 28px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 28px;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: rgba(255, 255, 255, 0.9);
}

.profile-body {
  text-align: center;
}

.profile-top {
  margin-bottom: 20px;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a017, #b8860b);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
  font-weight: 700;
  margin-bottom: 10px;
  overflow: hidden;
}

.profile-avatar.img {
  background: none;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
}

.profile-uid {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.stat-item.wins { border-color: rgba(34, 197, 94, 0.25); }
.stat-item.wins .stat-value { color: #4ade80; }
.stat-item.losses { border-color: rgba(239, 68, 68, 0.25); }
.stat-item.losses .stat-value { color: #f87171; }
.stat-item.winrate { border-color: rgba(212, 160, 23, 0.25); }
.stat-item.winrate .stat-value { color: #f0c850; }

.social-counts {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 20px;
}

.social-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 10px;
  transition: background 0.2s;
}

.social-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.social-value {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.social-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}

.follow-actions {
  margin-top: 4px;
}

.follow-btn {
  padding: 10px 36px;
  border: none;
  border-radius: 20px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.follow-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.do-follow {
  background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(212, 160, 23, 0.4);
}

.do-follow:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(212, 160, 23, 0.5);
}

.do-unfollow {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.do-unfollow:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
