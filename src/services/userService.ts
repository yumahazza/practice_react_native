import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "../config/firebaseConfig";
import { UserProfile, UserRole } from "../types";

const USERS_COLLECTION = "users";
const USER_CACHE_PREFIX = "@user_profile_";

/**
 * Membuat kunci unik yang aman berdasarkan alamat email untuk pencocokan akun tunggal.
 */
function sanitizeEmailKey(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "_");
}

/**
 * Menyimpan atau memperbarui profil pengguna terpadu (Unified Account Identity).
 * Memastikan bahwa akun dengan email yang sama selalu memiliki UID yang konsisten,
 * role "Super Admin", serta riwayat provider yang terhubung (Google dan Email/Password).
 */
export async function syncUserProfile(
  authUid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  providerId: string = "unknown"
): Promise<UserProfile> {
  const normalizedEmail = (email || `user_${authUid}@example.com`).toLowerCase().trim();
  const emailKey = sanitizeEmailKey(normalizedEmail);
  const cacheKey = `${USER_CACHE_PREFIX}${emailKey}`;

  // 1. Coba baca profil yang sudah ada dari cache lokal
  let existingProfile: UserProfile | null = null;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      existingProfile = JSON.parse(cached);
    }
  } catch {
    // Abaikan jika cache kosong
  }

  // 2. Coba baca dari Firestore jika dikonfigurasi
  if (!existingProfile && isFirebaseConfigured()) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, emailKey);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        existingProfile = userDoc.data() as UserProfile;
      }
    } catch (err) {
      console.warn("[UserService] Gagal membaca user dari Firestore:", err);
    }
  }

  // 3. Tentukan identitas akun tunggal (Canonical UID & Providers)
  // Jika akun sudah pernah dibuat sebelumnya dengan email yang sama, gunakan UID yang sudah ada
  const canonicalUid = existingProfile?.uid || authUid;
  
  // Gabungkan daftar provider yang terhubung
  const currentProviders = new Set<string>(existingProfile?.linkedProviders || []);
  if (providerId) {
    currentProviders.add(providerId);
  }
  if (existingProfile?.providerId) {
    currentProviders.add(existingProfile.providerId);
  }

  // Ekspektasi: Role akun adalah "Super Admin"
  const assignedRole: UserRole = existingProfile?.role || "Super Admin";

  const resolvedProfile: UserProfile = {
    uid: canonicalUid,
    email: normalizedEmail,
    displayName: displayName || existingProfile?.displayName || normalizedEmail.split("@")[0],
    photoURL: photoURL || existingProfile?.photoURL || null,
    providerId: providerId,
    role: assignedRole,
    linkedProviders: Array.from(currentProviders),
  };

  // 4. Simpan ke Cache Lokal
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(resolvedProfile));
  } catch (err) {
    console.warn("[UserService] Gagal menyimpan cache user:", err);
  }

  // 5. Simpan ke Firestore untuk persistensi Cloud
  if (isFirebaseConfigured()) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, emailKey);
      await setDoc(userDocRef, {
        ...resolvedProfile,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn("[UserService] Gagal menyinkronkan user ke Firestore:", err);
    }
  }

  console.log(`[UserService] Akun tersinkronisasi: [${resolvedProfile.email}] UID: ${resolvedProfile.uid} Role: ${resolvedProfile.role}`);
  return resolvedProfile;
}

/**
 * Mengambil hak akses berdasarkan role pengguna (RBAC).
 */
export function getRolePermissions(role?: UserRole | string) {
  const isSuperAdmin = role === "Super Admin";
  return {
    isSuperAdmin,
    canCreateMahasiswa: true,
    canDeleteMahasiswa: isSuperAdmin,
    canManageRoles: isSuperAdmin,
    canAccessSystemSettings: isSuperAdmin,
    canRunTestSuite: true,
    badgeColor: isSuperAdmin ? "#d97706" : "#2563eb",
  };
}
