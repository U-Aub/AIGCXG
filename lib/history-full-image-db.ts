/**
 * 历史记录完整图存 IndexedDB，避免 localStorage ~5MB 配额被 base64 大图撑爆。
 */

const DB_NAME = "id-photo-history-db"
const STORE = "fullImages"
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export async function putHistoryFullImage(id: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("idb put failed"))
    tx.objectStore(STORE).put(dataUrl, id)
  })
}

export async function getHistoryFullImage(id: string): Promise<string | undefined> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      tx.onerror = () => reject(tx.error ?? new Error("idb get failed"))
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result as string | undefined)
    })
  } catch {
    return undefined
  }
}

export async function deleteHistoryFullImage(id: string): Promise<void> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"))
      tx.objectStore(STORE).delete(id)
    })
  } catch {
    /* ignore */
  }
}

export async function clearHistoryFullImages(): Promise<void> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error("idb clear failed"))
      tx.objectStore(STORE).clear()
    })
  } catch {
    /* ignore */
  }
}
