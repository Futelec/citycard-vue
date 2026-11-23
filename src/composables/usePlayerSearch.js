import { ref } from 'vue'
import { getDatabase, ref as dbRef, get } from 'firebase/database'
import { getApps } from 'firebase/app'
import { lookupByCustomUid, searchByNickname, getUserProfile } from './useUserDB'

function getDB() {
  const apps = getApps()
  if (apps.length === 0) return null
  return getDatabase(apps[0])
}

const searching = ref(false)
const searchResults = ref([])
const searchError = ref('')

/**
 * Build a result object from firebaseUid
 */
async function buildResult(firebaseUid) {
  const profile = await getUserProfile(firebaseUid)
  if (!profile) return null

  const db = getDB()
  let wins = 0, losses = 0
  if (db) {
    const statsSnap = await get(dbRef(db, `users/${firebaseUid}/stats`))
    if (statsSnap.exists()) {
      const statsData = statsSnap.val()
      wins = statsData.wins || 0
      losses = statsData.losses || 0
    }
  }

  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  return {
    nickname: profile.nickname || '',
    customUid: profile.uid,
    avatar: profile.avatar || '',
    firebaseUid,
    wins,
    losses,
    total,
    winRate,
    followersCount: profile.followersCount || 0,
    followingCount: profile.followingCount || 0
  }
}

/**
 * Search for players by UID (numeric) or nickname (text).
 * Returns an array of results.
 */
async function searchPlayer(query) {
  if (!query || !query.trim()) {
    searchError.value = '请输入 UID 或昵称'
    searchResults.value = []
    return []
  }

  searching.value = true
  searchError.value = ''
  searchResults.value = []

  try {
    const trimmed = query.trim()
    let firebaseUids = []

    if (/^\d+$/.test(trimmed)) {
      // Numeric → look up by custom UID (single result)
      const uid = await lookupByCustomUid(trimmed)
      if (uid) firebaseUids = [uid]
    } else {
      // Text → search by nickname (multiple results)
      firebaseUids = await searchByNickname(trimmed)
    }

    if (firebaseUids.length === 0) {
      searchError.value = '未找到该玩家'
      return []
    }

    const results = (await Promise.all(firebaseUids.map(buildResult))).filter(Boolean)

    if (results.length === 0) {
      searchError.value = '未找到该玩家'
      return []
    }

    searchResults.value = results
    return results
  } catch (e) {
    searchError.value = '搜索失败，请重试'
    console.warn('[PlayerSearch]', e.message)
    return []
  } finally {
    searching.value = false
  }
}

export function usePlayerSearch() {
  return {
    searching,
    searchResults,
    searchError,
    searchPlayer
  }
}
