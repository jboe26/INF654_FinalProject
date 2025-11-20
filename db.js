const DB_NAME = "emergency-prep";
const DB_VERSION = 1;
let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("tasks")) {
        const store = db.createObjectStore("tasks", { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
      }
      if (!db.objectStoreNames.contains("deletes")) {
        db.createObjectStore("deletes", { keyPath: ["userId", "id"] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbUpsertTask(task) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("tasks", "readwrite");
    tx.objectStore("tasks").put(task);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGetTaskById(userId, id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("tasks", "readonly");
    tx.objectStore("tasks").get(id).onsuccess = (e) => {
      const t = e.target.result;
      res(t && t.userId === userId ? t : null);
    };
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGetTasksByUser(userId) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("tasks", "readonly");
    const idx = tx.objectStore("tasks").index("userId");
    const req = idx.getAll(userId);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbGetUnsyncedTasks(userId) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("tasks", "readonly");
    const idx = tx.objectStore("tasks").index("synced");
    const req = idx.getAll(false);
    req.onsuccess = () =>
      res((req.result || []).filter((t) => t.userId === userId));
    req.onerror = () => rej(req.error);
  });
}

async function idbDeleteTask(userId, id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("tasks", "readwrite");
    tx.objectStore("tasks").delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function queueDeleteForSync(userId, id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("deletes", "readwrite");
    tx.objectStore("deletes").put({ userId, id });
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

async function idbGetPendingDeletes(userId) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("deletes", "readonly");
    const store = tx.objectStore("deletes");
    const req = store.getAll();
    req.onsuccess = () =>
      res(
        (req.result || []).filter((d) => d.userId === userId).map((d) => d.id)
      );
    req.onerror = () => rej(req.error);
  });
}

async function idbClearDelete(userId, id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("deletes", "readwrite");
    tx.objectStore("deletes").delete([userId, id]);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

console.log("✅ IndexedDB ready");
