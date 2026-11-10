export const SESSION_LOCK_EVENT = 'lector:session-lock-settings'
export const SESSION_LOCK_TIMEOUT_MS = 15 * 60 * 1000

export function isLockTimeoutReached(lastActivity, now = Date.now()) {
  return now - lastActivity >= SESSION_LOCK_TIMEOUT_MS
}

export async function verifySessionUnlock(auth, { email, password, userId }, online) {
  if (!online) throw new Error('Conectate a internet para desbloquear la sesión.')
  const { data, error } = await auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.user?.id !== userId) throw new Error('La cuenta autenticada no coincide con la sesión bloqueada.')
}

export function sessionLockKey(userId) {
  return `lv-session-lock:${userId}`
}

export function isSessionLockEnabled(userId, storage = localStorage) {
  return !!userId && storage.getItem(sessionLockKey(userId)) === 'on'
}

export function setSessionLockEnabled(userId, enabled, storage = localStorage) {
  if (!userId) throw new Error('No hay una cuenta activa.')
  if (enabled) storage.setItem(sessionLockKey(userId), 'on')
  else storage.removeItem(sessionLockKey(userId))
}
