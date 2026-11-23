<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">{{ type === 'followers' ? '粉丝列表' : '关注列表' }}</h2>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div v-if="loading" class="list-loading">加载中...</div>

        <div v-else-if="list.length === 0" class="list-empty">
          {{ type === 'followers' ? '暂无粉丝' : '暂无关注' }}
        </div>

        <div v-else class="list-body">
          <div
            v-for="item in list"
            :key="item.firebaseUid"
            class="list-item"
            @click="openProfile(item)"
          >
            <span v-if="item.avatar && item.avatar.startsWith('data:')" class="item-avatar img">
              <img :src="item.avatar" alt="avatar" />
            </span>
            <span v-else class="item-avatar">{{ item.avatar || item.nickname?.charAt(0) || '?' }}</span>
            <div class="item-info">
              <div class="item-name">{{ item.nickname }}</div>
              <div class="item-uid">UID: {{ item.uid }}</div>
            </div>
            <span class="item-arrow">&#8250;</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getFollowingList, getFollowersList } from '../../composables/useFollow'

const props = defineProps({
  modelValue: Boolean,
  type: { type: String, default: 'followers' },
  firebaseUid: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue', 'open-profile'])

const list = ref([])
const loading = ref(false)

watch(() => props.modelValue, async (visible) => {
  if (visible && props.firebaseUid) {
    loading.value = true
    try {
      if (props.type === 'followers') {
        list.value = await getFollowersList(props.firebaseUid)
      } else {
        list.value = await getFollowingList(props.firebaseUid)
      }
    } catch (e) {
      console.warn('[FollowList]', e.message)
      list.value = []
    } finally {
      loading.value = false
    }
  }
})

function close() {
  emit('update:modelValue', false)
}

function openProfile(item) {
  emit('open-profile', item)
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
  z-index: 1004;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: linear-gradient(135deg, #1e2a4a 0%, #2a2340 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 28px;
  width: 90%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
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

.list-loading,
.list-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  padding: 30px 0;
}

.list-body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.list-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(212, 160, 23, 0.3);
}

.item-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a017, #b8860b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}

.item-avatar.img {
  background: none;
}

.item-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-uid {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.item-arrow {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
