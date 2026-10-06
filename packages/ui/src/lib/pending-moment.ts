// The dropped file, kept in IndexedDB until it is uploaded. Lets the email link (another tab, same
// origin) pick up the moment, and survives a reload mid sign-in. Per-origin: landing and app don't share it.

const DB_NAME = "ambar";

const STORE = "pending-moment";

const KEY = "current";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await openDb();

    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).finally(() => db.close());
  } catch {
    // Storage unavailable (private mode, blocked): the flow still works in this tab.
    return null;
  }
}

export async function savePendingMoment(file: File): Promise<void> {
  await withStore("readwrite", (store) => store.put(file, KEY));
}

export async function loadPendingMoment(): Promise<File | null> {
  const value = await withStore<File | undefined>("readonly", (store) => store.get(KEY));

  return value instanceof File ? value : null;
}

export async function clearPendingMoment(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(KEY));
}
