import { ref } from 'vue'
import { getDatabase, ref as dbRef, get, update, runTransaction } from 'firebase/database'
import { getApps } from 'firebase/app'
import { getUserProfile } from './useUserDB'

function getDB() {
  const apps = getApps()
  if (apps.length === 0) return null
  return getDatabase(apps[0])
}

/**
 * Follow a target user. Atomically writes to following/followers and increments counters.
 * @param {string} myFirebaseUid
 * @param {string} targetFirebaseUid
 */
export async function followUser(myFirebaseUid, targetFirebaseUid) {
  if (!myFirebaseUid || !targetFirebaseUid || myFirebaseUid === targetFirebaseUid) return
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  // Write following + followers edges atomically
  const updates = {}
  updates[`following/${myFirebaseUid}/${targetFirebaseUid}`] = true
  updates[`followers/${targetFirebaseUid}/${myFirebaseUid}`] = true
  await update(dbRef(db), updates)

  // Increment counters via transactions
  await Promise.all([
    runTransaction(dbRef(db, `users/${myFirebaseUid}/followingCount`), (v) => (v || 0) + 1),
    runTransaction(dbRef(db, `users/${targetFirebaseUid}/followersCount`), (v) => (v || 0) + 1)
  ])
}

/**
 * Unfollow a target user.
 * @param {string} myFirebaseUid
 * @param {string} targetFirebaseUid
 */
export async function unfollowUser(myFirebaseUid, targetFirebaseUid) {
  if (!myFirebaseUid || !targetFirebaseUid || myFirebaseUid === targetFirebaseUid) return
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  const updates = {}
  updates[`following/${myFirebaseUid}/${targetFirebaseUid}`] = null
  updates[`followers/${targetFirebaseUid}/${myFirebaseUid}`] = null
  await update(dbRef(db), updates)

  // Decrement counters via transactions (floor at 0)
  await Promise.all([
    runTransaction(dbRef(db, `users/${myFirebaseUid}/followingCount`), (v) => Math.max((v || 0) - 1, 0)),
    runTransaction(dbRef(db, `users/${targetFirebaseUid}/followersCount`), (v) => Math.max((v || 0) - 1, 0))
  ])
}

/**
 * Check if myFirebaseUid is following targetFirebaseUid.
 * @returns {Promise<boolean>}
 */
export async function isFollowing(myFirebaseUid, targetFirebaseUid) {
  if (!myFirebaseUid || !targetFirebaseUid) return false
  const db = getDB()
  if (!db) return false
  const snap = await get(dbRef(db, `following/${myFirebaseUid}/${targetFirebaseUid}`))
  return snap.exists()
}

/**
 * Get the list of users that firebaseUid is following.
 * Returns an array of profile objects.
 * @param {string} firebaseUid
 * @returns {Promise<Array>}
 */
export async function getFollowingList(firebaseUid) {
  if (!firebaseUid) return []
  const db = getDB()
  if (!db) return []

  const snap = await get(dbRef(db, `following/${firebaseUid}`))
  if (!snap.exists()) return []

  const keys = Object.keys(snap.val())
  const profiles = await Promise.all(
    keys.map(async (uid) => {
      const profile = await getUserProfile(uid)
      return profile ? { ...profile, firebaseUid: uid } : null
    })
  )
  return profiles.filter(Boolean)
}

/**
 * Get the list of followers for firebaseUid.
 * Returns an array of profile objects.
 * @param {string} firebaseUid
 * @returns {Promise<Array>}
 */
export async function getFollowersList(firebaseUid) {
  if (!firebaseUid) return []
  const db = getDB()
  if (!db) return []

  const snap = await get(dbRef(db, `followers/${firebaseUid}`))
  if (!snap.exists()) return []

  const keys = Object.keys(snap.val())
  const profiles = await Promise.all(
    keys.map(async (uid) => {
      const profile = await getUserProfile(uid)
      return profile ? { ...profile, firebaseUid: uid } : null
    })
  )
  return profiles.filter(Boolean)
}

/**
 * Load followingCount and followersCount as reactive refs.
 * @param {string} firebaseUid
 * @returns {{ followingCount: import('vue').Ref<number>, followersCount: import('vue').Ref<number>, load: () => Promise<void> }}
 */
export function loadFollowCounts(firebaseUid) {
  const followingCount = ref(0)
  const followersCount = ref(0)

  async function load() {
    if (!firebaseUid) return
    const profile = await getUserProfile(firebaseUid)
    if (profile) {
      followingCount.value = profile.followingCount || 0
      followersCount.value = profile.followersCount || 0
    }
  }

  return { followingCount, followersCount, load }
}
