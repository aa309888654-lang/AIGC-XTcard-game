const DB_NAME = "astra-frontline-cloud-v1";
const STORE_NAME = "sync-state";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (!("indexedDB" in window)) return Promise.reject(new Error("INDEXEDDB_UNAVAILABLE"));
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
  return dbPromise;
}

export async function readCloudValue<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const get = transaction.objectStore(STORE_NAME).get(key);
      get.onsuccess = () => resolve((get.result as T | undefined) ?? null);
      get.onerror = () => reject(get.error);
    });
  } catch {
    return null;
  }
}

export async function writeCloudValue<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // Storage may be unavailable; treat as best-effort.
  }
}
