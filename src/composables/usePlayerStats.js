import { ref, computed } from 'vue'
import { getDatabase, ref as dbRef, onValue, runTransaction } from 'firebase/database'
import { getApps } from 'firebase/app'

function getDB() {
  const apps = getApps()
  if (apps.length === 0) return null
  return getDatabase(apps[0])
}

const wins = ref(0)
const losses = ref(0)
const statsLoaded = ref(false)

const total = computed(() => wins.value + losses.value)
const winRate = computed(() => {
  if (total.value === 0) return 0
  return Math.round((wins.value / total.value) * 100)
})

let statsListener = null
let listenedPath = null

/**
 * Subscribe to /users/{firebaseUid}/stats via onValue
 */
function loadStats(firebaseUid) {
  if (!firebaseUid) return
  unloadStats()

  const db = getDB()
  if (!db) return

  const path = `users/${firebaseUid}/stats`
  listenedPath = path
  const statsRef = dbRef(db, path)

  statsListener = onValue(statsRef, (snapshot) => {
    const data = snapshot.val()
    wins.value = data?.wins || 0
    losses.value = data?.losses || 0
    statsLoaded.value = true
  }, (error) => {
    console.warn('[PlayerStats] 加载战绩失败:', error.message)
    statsLoaded.value = false
  })
}

/**
 * Unsubscribe from stats listener
 */
function unloadStats() {
  if (statsListener) {
    statsListener() // call the unsubscribe function returned by onValue
    statsListener = null
    listenedPath = null
  }
  wins.value = 0
  losses.value = 0
  statsLoaded.value = false
}

/**
 * Atomically increment a stat field (wins or losses)
 */
async function incrementStat(firebaseUid, field) {
  if (!firebaseUid || (field !== 'wins' && field !== 'losses')) return

  const db = getDB()
  if (!db) return

  try {
    const statRef = dbRef(db, `users/${firebaseUid}/stats/${field}`)
    await runTransaction(statRef, (currentValue) => {
      return (currentValue || 0) + 1
    })
  } catch (error) {
    console.warn(`[PlayerStats] 更新战绩失败 (${field}):`, error.message)
  }
}

/**
 * Record the outcome of an online game: winner +1 win, loser +1 loss
 */
async function recordOnlineGameEnd(winnerUid, loserUid) {
  if (!winnerUid || !loserUid) return
  await Promise.all([
    incrementStat(winnerUid, 'wins'),
    incrementStat(loserUid, 'losses')
  ])
}

export function usePlayerStats() {
  return {
    wins,
    losses,
    total,
    winRate,
    statsLoaded,
    loadStats,
    unloadStats,
    recordOnlineGameEnd
  }
}
