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

/**
 * Normalisasi data Mahasiswa dan hapus semua duplikat berdasarkan NIM maupun Nama.
 * Menjamin 1 mahasiswa hanya muncul 1 kali.
 */
export function deduplicateMahasiswa(list: Mahasiswa[]): Mahasiswa[] {
  const seenNim = new Set<string>();
  const seenNama = new Set<string>();
  const seenId = new Set<string>();
  const result: Mahasiswa[] = [];

  for (const raw of list) {
    if (!raw) continue;

    const nim = String(raw.nim ?? "").trim();
    const nama = String(raw.nama ?? "").trim();
    const jurusan = String(raw.jurusan ?? "").trim();
    const angkatan = String(raw.angkatan ?? "").trim();
    const id = String(raw.id || nim || nama).trim();

    if (!nim && !nama) continue;

    const nimKey = nim.toLowerCase();
    const namaKey = nama.toLowerCase();
    const idKey = id.toLowerCase();

    if (
      (nimKey && seenNim.has(nimKey)) ||
      (namaKey && seenNama.has(namaKey)) ||
      (idKey && seenId.has(idKey))
    ) {
      continue;
    }

    if (nimKey) seenNim.add(nimKey);
    if (namaKey) seenNama.add(namaKey);
    if (idKey) seenId.add(idKey);

    result.push({
      id,
      nim,
      nama,
      jurusan,
      angkatan,
      createdAt: raw.createdAt || new Date().toISOString(),
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
    let raw: string | null = null;
    if (typeof window !== "undefined" && window.localStorage) {
      raw = window.localStorage.getItem(STORAGE_MAHASISWA_KEY);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(STORAGE_MAHASISWA_KEY);
    }

    if (raw) {
      const list: Mahasiswa[] = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return deduplicateMahasiswa(list);
      }
    }
  } catch (_) {}

  await saveLocalMahasiswa(DEFAULT_MAHASISWA);
  return DEFAULT_MAHASISWA;
}

/**
 * Menyimpan data mahasiswa ke penyimpanan lokal (otomatis bersih dari duplikat).
 */
export async function saveLocalMahasiswa(list: Mahasiswa[]): Promise<Mahasiswa[]> {
  const cleanList = deduplicateMahasiswa(list);
  const json = JSON.stringify(cleanList);
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_MAHASISWA_KEY, json);
    }
    await AsyncStorage.setItem(STORAGE_MAHASISWA_KEY, json);
  } catch (_) {}
  return cleanList;
}

/**
 * Berlangganan data mahasiswa realtime.
 * Menggabungkan data lokal & Firestore dengan deduplikasi ketat berdasarkan NIM & Nama.
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
          const firestoreList: Mahasiswa[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Record<string, any>;
            firestoreList.push({
              id: docSnap.id,
              nim: String(data.nim ?? data.NIM ?? ""),
              nama: String(data.nama ?? data.name ?? ""),
              jurusan: String(data.jurusan ?? ""),
              angkatan: String(data.angkatan ?? ""),
              createdAt: String(data.createdAt ?? new Date().toISOString()),
            });
          });

          const currentLocal = await getLocalMahasiswa();

          // Urutkan gabungan dari yang terbaru lalu deduplikasi (prioritas item terbaru)
          const combined = [...firestoreList, ...currentLocal].sort((a, b) => {
            const tA = new Date(a.createdAt || 0).getTime();
            const tB = new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });

          const cleanMerged = await saveLocalMahasiswa(combined);
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
 * Menambahkan data mahasiswa baru.
 * Menggunakan NIM sebagai Document ID di Firestore & Lokal agar tidak pernah membuat 2 dokumen ganda.
 */
export async function addMahasiswa(data: Omit<Mahasiswa, "id">): Promise<Mahasiswa> {
  const cleanNim = String(data.nim ?? "").trim();
  const cleanNama = String(data.nama ?? "").trim();
  const cleanJurusan = String(data.jurusan ?? "").trim();
  const cleanAngkatan = String(data.angkatan ?? "").trim();

  // Gunakan NIM sebagai ID unik agar di Lokal & Firestore ID-nya selalu sama persis
  const docId = cleanNim || "mhs-" + Date.now();

  const newItem: Mahasiswa = {
    id: docId,
    nim: cleanNim,
    nama: cleanNama,
    jurusan: cleanJurusan,
    angkatan: cleanAngkatan,
    createdAt: new Date().toISOString(),
  };

  // 1. Simpan ke lokal (otomatis terdeduplikasi) dan beritahu UI
  const currentList = await getLocalMahasiswa();
  const cleanUpdated = await saveLocalMahasiswa([newItem, ...currentList]);
  notifyListeners(cleanUpdated);

  // 2. Sinkronkan ke Cloud Firestore menggunakan setDoc dengan ID = NIM (mencegah duplikat di Firestore)
  if (isFirebaseConfigured()) {
    (async () => {
      try {
        await setDoc(doc(db, MAHASISWA_COLLECTION, docId), {
          nim: newItem.nim,
          nama: newItem.nama,
          jurusan: newItem.jurusan,
          angkatan: newItem.angkatan,
          createdAt: newItem.createdAt,
        });
        console.log("[MahasiswaService] Tersimpan di Firestore ID:", docId);
      } catch (err: any) {
        console.warn("[MahasiswaService] Gagal sinkron Firestore:", err?.message);
      }
    })();
  }

  return newItem;
}

/**
 * Menghapus data mahasiswa berdasarkan ID atau NIM.
 */
export async function deleteMahasiswa(id: string, nim?: string): Promise<void> {
  const currentList = await getLocalMahasiswa();
  const updated = currentList.filter(
    (m) => m.id !== id && (!nim || String(m.nim).trim() !== String(nim).trim())
  );
  const cleanUpdated = await saveLocalMahasiswa(updated);
  notifyListeners(cleanUpdated);

  if (isFirebaseConfigured()) {
    try {
      await deleteDoc(doc(db, MAHASISWA_COLLECTION, id));
      if (nim && nim !== id) {
        await deleteDoc(doc(db, MAHASISWA_COLLECTION, nim));
      }
    } catch (_) {}
  }
}
