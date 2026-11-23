<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title">搜索玩家</h2>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <div class="search-bar">
          <input
            v-model="query"
            type="text"
            placeholder="输入 UID 或昵称"
            class="search-input"
            @keyup.enter="doSearch"
          />
          <button class="search-btn" :disabled="searching" @click="doSearch">
            {{ searching ? '搜索中...' : '搜索' }}
          </button>
        </div>

        <div v-if="searchError" class="search-empty">{{ searchError }}</div>

        <div v-if="searchResults.length > 0" class="results-list">
          <div
            v-for="result in searchResults"
            :key="result.firebaseUid"
            class="result-card"
            @click="openProfile(result)"
          >
            <span v-if="result.avatar && result.avatar.startsWith('data:')" class="result-avatar img">
              <img :src="result.avatar" alt="avatar" />
            </span>
            <span v-else class="result-avatar">{{ result.avatar || result.nickname?.charAt(0) || '?' }}</span>
            <div class="result-info">
              <div class="result-name">{{ result.nickname }}</div>
              <div class="result-uid">UID: {{ result.customUid }}</div>
              <div class="result-stats">
                总场次 {{ result.total }} | 胜率 {{ result.winRate }}% | 粉丝 {{ result.followersCount }}
              </div>
            </div>
            <span class="result-arrow">&#8250;</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerSearch } from '../../composables/usePlayerSearch'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue', 'open-profile'])

const { searching, searchResults, searchError, searchPlayer } = usePlayerSearch()
const query = ref('')

function close() {
  emit('update:modelValue', false)
}

async function doSearch() {
  await searchPlayer(query.value)
}

function openProfile(result) {
  emit('open-profile', result)
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
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: linear-gradient(135deg, #1e2a4a 0%, #2a2340 100%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 28px;
  width: 90%;
  max-width: 440px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
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

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: white;
  font-size: 15px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.search-input:focus {
  border-color: rgba(212, 160, 23, 0.5);
}

.search-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.search-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(212, 160, 23, 0.4);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.search-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  padding: 20px 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.result-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.result-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(212, 160, 23, 0.3);
}

.result-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a017, #b8860b);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}

.result-avatar.img {
  background: none;
}

.result-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-uid {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
}

.result-stats {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.result-arrow {
  font-size: 22px;
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
