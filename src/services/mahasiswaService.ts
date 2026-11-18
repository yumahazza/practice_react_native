import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "../config/firebaseConfig";
import { Mahasiswa } from "../types";

const MAHASISWA_COLLECTION = "mahasiswa";
const STORAGE_MAHASISWA_KEY = "@mahasiswa_database_data";
const STORAGE_DELETED_IDS_KEY = "@mahasiswa_deleted_ids";
const STORAGE_PENDING_SYNC_KEY = "@mahasiswa_pending_sync";

export const DEFAULT_MAHASISWA: Mahasiswa[] = [
  {
    id: "1201223045",
    nim: "1201223045",
    nama: "Yuma Hazza Yuditama",
    jurusan: "S1 Rekayasa Perangkat Lunak",
    angkatan: "2022",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "1201221012",
    nim: "1201221012",
    nama: "Kimi Antonelli",
    jurusan: "S1 Teknik Informatika",
    angkatan: "2023",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

const DEFAULT_IDS = new Set(DEFAULT_MAHASISWA.map((m) => String(m.id)));

async function readStorageValue(key: string): Promise<string | null> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeStorageValue(key: string, value: string): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    await AsyncStorage.setItem(key, value);
  } catch {}
}

async function getDeletedIds(): Promise<Set<string>> {
  try {
    const raw = await readStorageValue(STORAGE_DELETED_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map((x) => String(x)));
      }
    }
  } catch {}
  return new Set();
}

async function markIdDeleted(id: string): Promise<void> {
  if (!id) return;
  const deleted = await getDeletedIds();
  deleted.add(id);
  await writeStorageValue(STORAGE_DELETED_IDS_KEY, JSON.stringify(Array.from(deleted)));
}

async function getPendingSyncMap(): Promise<Record<string, Mahasiswa>> {
  try {
    const raw = await readStorageValue(STORAGE_PENDING_SYNC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, Mahasiswa>;
      }
    }
  } catch {}
  return {};
}

async function setPendingSyncItem(item: Mahasiswa): Promise<void> {
  if (!item.id) return;
  const map = await getPendingSyncMap();
  map[item.id] = item;
  await writeStorageValue(STORAGE_PENDING_SYNC_KEY, JSON.stringify(map));
}

async function removePendingSyncId(id: string): Promise<void> {
  if (!id) return;
  const map = await getPendingSyncMap();
  if (id in map) {
    delete map[id];
    await writeStorageValue(STORAGE_PENDING_SYNC_KEY, JSON.stringify(map));
  }
}

/**
 * Normalisasi data Mahasiswa dan hapus semua duplikat berdasarkan ID / NIM.
 * Menjamin 1 mahasiswa hanya muncul 1 kali.
 */
export function deduplicateMahasiswa(list: Mahasiswa[]): Mahasiswa[] {
  const seenId = new Set<string>();
  const seenNim = new Set<string>();
  const result: Mahasiswa[] = [];

  for (const raw of list) {
    if (!raw) continue;

    const nim = String(raw.nim ?? "").trim();
    const nama = String(raw.nama ?? "").trim();
    const jurusan = String(raw.jurusan ?? "").trim();
    const angkatan = String(raw.angkatan ?? "").trim();
    const id = String(raw.id || nim || nama).trim();

    if (!nim && !nama) continue;

    const idKey = id.toLowerCase();
    const nimKey = nim.toLowerCase();

    if ((idKey && seenId.has(idKey)) || (nimKey && seenNim.has(nimKey))) {
      continue;
    }

    if (idKey) seenId.add(idKey);
    if (nimKey) seenNim.add(nimKey);

    result.push({
      id,
      nim,
      nama,
      jurusan,
      angkatan,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt,
    });
  }

  return result;
}

// Listener internal agar perubahan lokal langsung tersinkron ke komponen UI secara tunggal
type LocalListener = (data: Mahasiswa[]) => void;
const localListeners = new Set<LocalListener>();

function notifyListeners(data: Mahasiswa[]) {
  const clean = deduplicateMahasiswa(data);
  localListeners.forEach((listener) => listener(clean));
}

/**
 * Mengambil data mahasiswa yang tersimpan di lokal (bebas duplikat).
 */
export async function getLocalMahasiswa(): Promise<Mahasiswa[]> {
  try {
    const raw = await readStorageValue(STORAGE_MAHASISWA_KEY);
    if (raw) {
      const list: Mahasiswa[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        return deduplicateMahasiswa(list);
      }
    }
  } catch {}

  const deletedIds = await getDeletedIds();
  const initialSeeds = DEFAULT_MAHASISWA.filter((m) => !deletedIds.has(String(m.id)));
  await saveLocalMahasiswa(initialSeeds);
  return initialSeeds;
}

/**
 * Menyimpan data mahasiswa ke penyimpanan lokal (otomatis bersih dari duplikat).
 */
export async function saveLocalMahasiswa(list: Mahasiswa[]): Promise<Mahasiswa[]> {
  const cleanList = deduplicateMahasiswa(list);
  await writeStorageValue(STORAGE_MAHASISWA_KEY, JSON.stringify(cleanList));
  return cleanList;
}

/**
 * Berlangganan data mahasiswa realtime.
 * Memprioritaskan data Firestore, sambil menjaga pembaruan lokal yang belum tersinkron
 * dan mencegah entri lama yang sudah diubah/dihapus muncul kembali sebagai duplikat.
 */
export function subscribeMahasiswaList(
  onUpdate: (data: Mahasiswa[]) => void
): () => void {
  let isSubscribed = true;

  const safeUpdate = (data: Mahasiswa[]) => {
    if (isSubscribed) {
      onUpdate(deduplicateMahasiswa(data));
    }
  };

  localListeners.add(safeUpdate);

  // 1. Tampilkan data lokal terlebih dahulu secara instan
  getLocalMahasiswa().then((localData) => {
    safeUpdate(localData);
  });

  if (!isFirebaseConfigured()) {
    return () => {
      isSubscribed = false;
      localListeners.delete(safeUpdate);
    };
  }

  try {
    const colRef = collection(db, MAHASISWA_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (!isSubscribed) return;

        try {
          const [deletedIds, pendingMap, currentLocal] = await Promise.all([
            getDeletedIds(),
            getPendingSyncMap(),
            getLocalMahasiswa(),
          ]);

          const firestoreById = new Map<string, Mahasiswa>();
          snapshot.forEach((docSnap) => {
            if (deletedIds.has(docSnap.id)) return;
            const data = docSnap.data() as Record<string, any>;
            firestoreById.set(docSnap.id, {
              id: docSnap.id,
              nim: String(data.nim ?? data.NIM ?? "").trim(),
              nama: String(data.nama ?? data.name ?? "").trim(),
              jurusan: String(data.jurusan ?? "").trim(),
              angkatan: String(data.angkatan ?? "").trim(),
              createdAt: String(data.createdAt ?? new Date().toISOString()),
              updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
            });
          });

          const mergedById = new Map<string, Mahasiswa>();

          // Masukkan data dari Firestore terlebih dahulu
          for (const [id, fsItem] of firestoreById.entries()) {
            const pendingItem = pendingMap[id];
            if (pendingItem) {
              const fsTime = fsItem.updatedAt ? new Date(fsItem.updatedAt).getTime() : 0;
              const pendingTime = pendingItem.updatedAt
                ? new Date(pendingItem.updatedAt).getTime()
                : 0;
              const matchesPending =
                fsItem.nim === pendingItem.nim &&
                fsItem.nama === pendingItem.nama &&
                fsItem.jurusan === pendingItem.jurusan &&
                fsItem.angkatan === pendingItem.angkatan;

              if (matchesPending || fsTime >= pendingTime) {
                mergedById.set(id, fsItem);
                await removePendingSyncId(id);
              } else {
                mergedById.set(id, pendingItem);
              }
            } else {
              mergedById.set(id, fsItem);
            }
          }

          // Masukkan perubahan/penambahan lokal yang belum sempat terpantul dari Firestore
          for (const [id, pendingItem] of Object.entries(pendingMap)) {
            if (!deletedIds.has(id) && !mergedById.has(id)) {
              mergedById.set(id, pendingItem);
            }
          }

          // Pertahankan seed awal (Yuma & Kimi) bila belum ada di Firestore dan belum dihapus
          for (const item of currentLocal) {
            const id = String(item.id || "");
            if (
              DEFAULT_IDS.has(id) &&
              !deletedIds.has(id) &&
              !mergedById.has(id)
            ) {
              mergedById.set(id, item);
            }
          }

          const sortedMerged = Array.from(mergedById.values()).sort((a, b) => {
            const tA = new Date(a.createdAt || 0).getTime();
            const tB = new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });

          const cleanMerged = await saveLocalMahasiswa(sortedMerged);
          safeUpdate(cleanMerged);
        } catch (err) {
          console.warn("[MahasiswaService] Gagal memproses snapshot:", err);
        }
      },
      (error) => {
        console.warn("[MahasiswaService] Firestore offline:", error.message);
      }
    );

    return () => {
      isSubscribed = false;
      localListeners.delete(safeUpdate);
      unsubscribe();
    };
  } catch (error) {
    console.warn("[MahasiswaService] Gagal subscribe firestore:", error);
    return () => {
      isSubscribed = false;
      localListeners.delete(safeUpdate);
    };
  }
}

/**
 * Menambahkan data mahasiswa baru dengan ID dokumen unik yang stabil.
 */
export async function addMahasiswa(data: Omit<Mahasiswa, "id">): Promise<Mahasiswa> {
  const cleanNim = String(data.nim ?? "").trim();
  const cleanNama = String(data.nama ?? "").trim();
  const cleanJurusan = String(data.jurusan ?? "").trim();
  const cleanAngkatan = String(data.angkatan ?? "").trim();

  const docId = isFirebaseConfigured()
    ? doc(collection(db, MAHASISWA_COLLECTION)).id
    : "mhs-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

  const nowIso = new Date().toISOString();
  const newItem: Mahasiswa = {
    id: docId,
    nim: cleanNim,
    nama: cleanNama,
    jurusan: cleanJurusan,
    angkatan: cleanAngkatan,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await setPendingSyncItem(newItem);

  const currentList = await getLocalMahasiswa();
  const cleanUpdated = await saveLocalMahasiswa([newItem, ...currentList]);
  notifyListeners(cleanUpdated);

  if (isFirebaseConfigured()) {
    setDoc(doc(db, MAHASISWA_COLLECTION, docId), {
      nim: newItem.nim,
      nama: newItem.nama,
      jurusan: newItem.jurusan,
      angkatan: newItem.angkatan,
      createdAt: newItem.createdAt,
      updatedAt: newItem.updatedAt,
    })
      .then(() => removePendingSyncId(docId))
      .catch((err: any) => {
        console.warn("[MahasiswaService] Gagal sinkron Firestore:", err?.message);
      });
  }

  return newItem;
}

/**
 * Memperbarui data mahasiswa yang sudah ada pada penyimpanan lokal dan Cloud Firestore.
 * Selalu mempertahankan ID dokumen yang sama agar tidak membuat data mahasiswa baru.
 */
export async function updateMahasiswa(
  originalId: string,
  originalNim: string,
  data: Omit<Mahasiswa, "id" | "createdAt">
): Promise<Mahasiswa> {
  const cleanNim = String(data.nim ?? "").trim();
  const cleanNama = String(data.nama ?? "").trim();
  const cleanJurusan = String(data.jurusan ?? "").trim();
  const cleanAngkatan = String(data.angkatan ?? "").trim();

  const currentList = await getLocalMahasiswa();
  const matchedIndex = currentList.findIndex(
    (m) =>
      (originalId && m.id === originalId) ||
      (originalNim && String(m.nim).trim() === String(originalNim).trim())
  );

  const existingItem = matchedIndex >= 0 ? currentList[matchedIndex] : undefined;
  const targetId = String(existingItem?.id || originalId || cleanNim).trim();
  const nowIso = new Date().toISOString();

  const updatedItem: Mahasiswa = {
    id: targetId,
    nim: cleanNim,
    nama: cleanNama,
    jurusan: cleanJurusan,
    angkatan: cleanAngkatan,
    createdAt: existingItem?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  if (originalNim && originalNim !== targetId && DEFAULT_IDS.has(originalNim)) {
    await markIdDeleted(originalNim);
  }

  const updatedList =
    matchedIndex >= 0
      ? currentList.map((m, idx) => (idx === matchedIndex ? updatedItem : m))
      : [updatedItem, ...currentList];

  await setPendingSyncItem(updatedItem);

  const cleanUpdated = await saveLocalMahasiswa(updatedList);
  notifyListeners(cleanUpdated);

  if (isFirebaseConfigured()) {
    setDoc(doc(db, MAHASISWA_COLLECTION, targetId), {
      nim: updatedItem.nim,
      nama: updatedItem.nama,
      jurusan: updatedItem.jurusan,
      angkatan: updatedItem.angkatan,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    })
      .then(() => removePendingSyncId(targetId))
      .catch((err: any) => {
        console.warn("[MahasiswaService] Gagal memperbarui di Firestore:", err?.message);
      });
  }

  return updatedItem;
}

/**
 * Menghapus data mahasiswa berdasarkan ID atau NIM.
 */
export async function deleteMahasiswa(id: string, nim?: string): Promise<void> {
  if (id) {
    await markIdDeleted(id);
    await removePendingSyncId(id);
  }
  if (nim && nim !== id) {
    await markIdDeleted(nim);
    await removePendingSyncId(nim);
  }

  const currentList = await getLocalMahasiswa();
  const updated = currentList.filter(
    (m) => m.id !== id && (!nim || String(m.nim).trim() !== String(nim).trim())
  );
  const cleanUpdated = await saveLocalMahasiswa(updated);
  notifyListeners(cleanUpdated);

  if (isFirebaseConfigured()) {
    deleteDoc(doc(db, MAHASISWA_COLLECTION, id)).catch(() => {});
    if (nim && nim !== id) {
      deleteDoc(doc(db, MAHASISWA_COLLECTION, nim)).catch(() => {});
    }
  }
}
