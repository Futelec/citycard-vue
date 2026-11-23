import { getDatabase, ref, get, set, update, runTransaction, query, orderByChild, equalTo } from 'firebase/database'
import { getApps } from 'firebase/app'

export const DEFAULT_AVATARS = ['🏙️', '🌃', '🌆', '🏰', '🗼', '🌉', '🎡', '🏟️', '🛕', '🏛️', '🗽', '🌇']

function getDB() {
  const apps = getApps()
  if (apps.length === 0) return null
  return getDatabase(apps[0])
}

/**
 * Atomically allocate the next uid using runTransaction on /meta/uidCounter
 * @returns {Promise<number>} the newly allocated uid
 */
export async function allocateUid() {
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  const counterRef = ref(db, 'meta/uidCounter')
  const result = await runTransaction(counterRef, (currentValue) => {
    return (currentValue || 0) + 1
  })

  if (!result.committed) {
    throw new Error('分配 UID 失败，请重试')
  }
  return result.snapshot.val()
}

/**
 * Check if a nickname is already taken
 * @param {string} nickname
 * @returns {Promise<boolean>}
 */
export async function isNicknameTaken(nickname) {
  const db = getDB()
  if (!db) return false

  const key = nickname.toLowerCase()
  const snap = await get(ref(db, `nicknames/${key}`))
  return snap.exists()
}

/**
 * Reserve a nickname for a given firebaseUid.
 * Stores the Firebase Auth email so nickname-based login can look it up.
 * @param {string} nickname
 * @param {string} firebaseUid
 * @param {string} [authEmail] - the Firebase Auth email used for signInWithEmailAndPassword
 */
export async function reserveNickname(nickname, firebaseUid, authEmail) {
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  const key = nickname.toLowerCase()
  await set(ref(db, `nicknames/${key}`), {
    uid: firebaseUid,
    authEmail: authEmail || ''
  })
}

/**
 * Get the Firebase Auth email stored in the nickname index.
 * Returns null if the nickname doesn't exist or has no authEmail.
 * Handles both old format (plain string) and new format ({ uid, authEmail }).
 * @param {string} nickname
 * @returns {Promise<string|null>}
 */
export async function getLoginEmail(nickname) {
  const db = getDB()
  if (!db) return null

  const key = nickname.toLowerCase()
  const snap = await get(ref(db, `nicknames/${key}`))
  if (!snap.exists()) return null

  const val = snap.val()
  // New format: { uid, authEmail }
  if (val && typeof val === 'object' && val.authEmail) {
    return val.authEmail
  }
  // Old format: plain firebaseUid string — no authEmail available
  return null
}

/**
 * Release a previously reserved nickname
 * @param {string} nickname
 */
export async function releaseNickname(nickname) {
  const db = getDB()
  if (!db) return

  const key = nickname.toLowerCase()
  await set(ref(db, `nicknames/${key}`), null)
}

// ---- Email index (similar to nickname index) ----

/**
 * Convert email to a Firebase-safe key (dots are not allowed in RTDB keys).
 */
function emailToKey(email) {
  return email.toLowerCase().replace(/\./g, ',')
}

/**
 * Reserve an email in the /emails index.
 * Maps a user-facing email to the Firebase Auth email used for login.
 * @param {string} email - user-facing email (the "real" email)
 * @param {string} firebaseUid
 * @param {string} authEmail - the Firebase Auth email for signInWithEmailAndPassword
 */
export async function reserveEmail(email, firebaseUid, authEmail) {
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  const key = emailToKey(email)
  await set(ref(db, `emails/${key}`), {
    uid: firebaseUid,
    authEmail: authEmail || ''
  })
}

/**
 * Check if an email is already bound to another account.
 * @param {string} email
 * @param {string} [excludeUid] - skip this firebaseUid (for "is it bound to someone else?")
 * @returns {Promise<boolean>}
 */
export async function isEmailBound(email, excludeUid) {
  const db = getDB()
  if (!db) return false

  const key = emailToKey(email)
  const snap = await get(ref(db, `emails/${key}`))
  if (!snap.exists()) return false
  if (excludeUid) {
    const val = snap.val()
    const storedUid = typeof val === 'object' ? val.uid : val
    if (storedUid === excludeUid) return false
    // Check if the referenced account still exists; if not, clean up stale entry
    const profileSnap = await get(ref(db, `users/${storedUid}`))
    if (!profileSnap.exists()) {
      await set(ref(db, `emails/${key}`), null)
      return false
    }
    return true
  }
  return true
}

/**
 * Get the Firebase Auth email from the email index for login.
 * @param {string} email - the user-facing email
 * @returns {Promise<string|null>}
 */
export async function getEmailAuthEmail(email) {
  const db = getDB()
  if (!db) return null

  const key = emailToKey(email)
  const snap = await get(ref(db, `emails/${key}`))
  if (!snap.exists()) return null

  const val = snap.val()
  if (val && typeof val === 'object' && val.authEmail) {
    return val.authEmail
  }
  return null
}

/**
 * Get the Firebase UID associated with an email in the index.
 * @param {string} email
 * @returns {Promise<string|null>}
 */
export async function getEmailUid(email) {
  const db = getDB()
  if (!db) return null

  const key = emailToKey(email)
  const snap = await get(ref(db, `emails/${key}`))
  if (!snap.exists()) return null

  const val = snap.val()
  return (val && typeof val === 'object' ? val.uid : val) || null
}

/**
 * Release an email from the index.
 * @param {string} email
 */
export async function releaseEmail(email) {
  const db = getDB()
  if (!db) return

  const key = emailToKey(email)
  await set(ref(db, `emails/${key}`), null)
}

// ---- UID reverse index (for search by custom uid) ----

/**
 * Write /uids/{customUid} → firebaseUid (reverse index for player search)
 * @param {number|string} customUid
 * @param {string} firebaseUid
 */
export async function ensureUidIndex(customUid, firebaseUid) {
  if (!customUid || !firebaseUid) return
  const db = getDB()
  if (!db) return
  await set(ref(db, `uids/${customUid}`), firebaseUid)
}

/**
 * Look up firebaseUid by custom uid.
 * Tries multiple strategies: /uids index → query → full scan.
 * @param {string|number} customUid
 * @returns {Promise<string|null>}
 */
export async function lookupByCustomUid(customUid) {
  const db = getDB()
  if (!db) return null
  const numericUid = Number(customUid)

  // Strategy 1: /uids index (fast path)
  try {
    const snap = await get(ref(db, `uids/${customUid}`))
    if (snap.exists()) {
      console.log('[Search] /uids index hit')
      return snap.val()
    }
  } catch (e) {
    console.warn('[Search] /uids index read failed:', e.message)
  }

  // Strategy 2: query /users with orderByChild (requires .indexOn rule)
  if (!isNaN(numericUid)) {
    try {
      const q = query(ref(db, 'users'), orderByChild('uid'), equalTo(numericUid))
      const usersSnap = await get(q)
      if (usersSnap.exists()) {
        const keys = Object.keys(usersSnap.val())
        if (keys.length > 0) {
          console.log('[Search] query hit')
          return keys[0]
        }
      }
    } catch (e) {
      console.warn('[Search] query fallback failed:', e.message)
    }
  }

  // Strategy 3: read all /users and filter client-side (brute force)
  try {
    const allSnap = await get(ref(db, 'users'))
    if (allSnap.exists()) {
      const allUsers = allSnap.val()
      for (const [fbUid, profile] of Object.entries(allUsers)) {
        if (profile && (profile.uid === numericUid || String(profile.uid) === String(customUid))) {
          console.log('[Search] full scan hit')
          // Backfill /uids index for future fast lookups
          ensureUidIndex(profile.uid, fbUid).catch(() => {})
          return fbUid
        }
      }
    }
  } catch (e) {
    console.warn('[Search] full scan failed:', e.message)
  }

  return null
}

/**
 * Look up firebaseUid by nickname.
 * Tries /nicknames index → query → full scan.
 * @param {string} nickname
 * @returns {Promise<string|null>}
 */
export async function lookupByNickname(nickname) {
  const db = getDB()
  if (!db) return null

  // Strategy 1: /nicknames index (fast path)
  const key = nickname.toLowerCase()
  try {
    const snap = await get(ref(db, `nicknames/${key}`))
    if (snap.exists()) {
      const val = snap.val()
      return (val && typeof val === 'object') ? val.uid : val
    }
  } catch (e) {
    console.warn('[Search] /nicknames read failed:', e.message)
  }

  // Strategy 2: query /users by nickname
  try {
    const q = query(ref(db, 'users'), orderByChild('nickname'), equalTo(nickname))
    const usersSnap = await get(q)
    if (usersSnap.exists()) {
      const keys = Object.keys(usersSnap.val())
      if (keys.length > 0) return keys[0]
    }
  } catch (e) {
    console.warn('[Search] nickname query failed:', e.message)
  }

  // Strategy 3: read all /users, try exact match first, then partial (contains)
  try {
    const allSnap = await get(ref(db, 'users'))
    if (allSnap.exists()) {
      const allUsers = allSnap.val()
      const lowerNick = nickname.toLowerCase()
      const entries = Object.entries(allUsers)

      // 3a: exact match
      for (const [fbUid, profile] of entries) {
        if (profile?.nickname && profile.nickname.toLowerCase() === lowerNick) {
          return fbUid
        }
      }

      // 3b: partial match (包含匹配，如搜"通州"匹配"君到通州见")
      for (const [fbUid, profile] of entries) {
        if (profile?.nickname && profile.nickname.toLowerCase().includes(lowerNick)) {
          return fbUid
        }
      }
    }
  } catch (e) {
    console.warn('[Search] nickname full scan failed:', e.message)
  }

  return null
}

/**
 * 搜索所有昵称包含关键词的玩家，返回 firebaseUid 数组（最多 20 个）
 */
export async function searchByNickname(keyword) {
  const db = getDB()
  if (!db) return []

  try {
    const allSnap = await get(ref(db, 'users'))
    if (!allSnap.exists()) return []

    const allUsers = allSnap.val()
    const lowerKey = keyword.toLowerCase()
    const exact = []
    const partial = []

    for (const [fbUid, profile] of Object.entries(allUsers)) {
      if (!profile?.nickname) continue
      const lower = profile.nickname.toLowerCase()
      if (lower === lowerKey) {
        exact.push(fbUid)
      } else if (lower.includes(lowerKey)) {
        partial.push(fbUid)
      }
    }

    return [...exact, ...partial].slice(0, 20)
  } catch (e) {
    console.warn('[Search] searchByNickname failed:', e.message)
    return []
  }
}

/**
 * Create a user profile in /users/{firebaseUid}
 * @param {string} firebaseUid
 * @param {object} data - { uid, nickname, avatar, isGuest, phoneNumber, email }
 */
export async function createUserProfile(firebaseUid, data) {
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  await set(ref(db, `users/${firebaseUid}`), {
    uid: data.uid,
    nickname: data.nickname || '',
    avatar: data.avatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
    isGuest: data.isGuest || false,
    createdAt: Date.now(),
    phoneNumber: data.phoneNumber || '',
    email: data.email || '',
    followingCount: 0,
    followersCount: 0
  })
}

/**
 * Get user profile from /users/{firebaseUid}
 * @param {string} firebaseUid
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(firebaseUid) {
  const db = getDB()
  if (!db) return null

  const snap = await get(ref(db, `users/${firebaseUid}`))
  return snap.exists() ? snap.val() : null
}

/**
 * Update user profile fields
 * @param {string} firebaseUid
 * @param {object} updates - partial fields to update
 */
export async function updateUserProfile(firebaseUid, updates) {
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  await update(ref(db, `users/${firebaseUid}`), updates)
}

/**
 * Delete user profile from /users/{firebaseUid}
 * @param {string} firebaseUid
 */
export async function deleteUserProfile(firebaseUid) {
  const db = getDB()
  if (!db) throw new Error('Firebase 未初始化')

  await set(ref(db, `users/${firebaseUid}`), null)
}
