import { doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "../config/firebaseConfig";
import { COLORS } from "../constants/theme";
import { UserProfile, UserRole } from "../types";

const USERS_COLLECTION = "users";
const USER_CACHE_PREFIX = "@user_profile_";

const CANONICAL_USERNAMES: Record<string, string> = {
  "yumatamahazza@gmail.com": "yumahazza",
  "yumahazza@portal.local": "yumahazza",
  "yumatamahazza@portal.local": "yumahazza",
  yumahazza: "yumahazza",
  yumatamahazza: "yumahazza",
  "yuma hazza yuditama": "yumahazza",
};

const SUPER_ADMIN_EMAILS = new Set([
  "yumatamahazza@gmail.com",
  "yumahazza@portal.local",
  "yumatamahazza@portal.local",
  "superadmin.test@gmail.com",
]);

/**
 * Menentukan role pengguna secara konsisten.
 * Akun dengan username 'yumahazza' (baik sign-in biasa maupun Google) otomatis berstatus Super Admin.
 */
export function resolveUserRole(
  email?: string | null,
  displayName?: string | null,
  existingRole?: UserRole
): UserRole {
  const normalizedEmail = (email || "").toLowerCase().trim();
  const normalizedName = (displayName || "").toLowerCase().trim();

  if (
    normalizedName === "yumahazza" ||
    SUPER_ADMIN_EMAILS.has(normalizedEmail)
  ) {
    return "Super Admin";
  }

  return existingRole || "Mahasiswa";
}

/**
 * Menyeragamkan username/displayName agar konsisten antara login Google dan Email/Password.
 */
export function resolveCanonicalUsername(
  email?: string | null,
  candidateName?: string | null,
  existingName?: string | null
): string {
  const normalizedEmail = (email || "").toLowerCase().trim();
  if (normalizedEmail && CANONICAL_USERNAMES[normalizedEmail]) {
    return CANONICAL_USERNAMES[normalizedEmail];
  }

  for (const rawName of [candidateName, existingName]) {
    const clean = (rawName || "").trim();
    if (clean && CANONICAL_USERNAMES[clean.toLowerCase()]) {
      return CANONICAL_USERNAMES[clean.toLowerCase()];
    }
  }

  const cleanExisting = (existingName || "").trim();
  if (cleanExisting) {
    return cleanExisting;
  }

  const cleanCandidate = (candidateName || "").trim();
  if (cleanCandidate) {
    return cleanCandidate;
  }

  return normalizedEmail.split("@")[0] || "Mahasiswa";
}

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

  const resolvedDisplayName = resolveCanonicalUsername(
    normalizedEmail,
    displayName,
    existingProfile?.displayName
  );
  const assignedRole: UserRole = resolveUserRole(
    normalizedEmail,
    resolvedDisplayName,
    existingProfile?.role
  );

  const resolvedProfile: UserProfile = {
    uid: canonicalUid,
    email: normalizedEmail,
    displayName: resolvedDisplayName,
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
    badgeColor: isSuperAdmin ? COLORS.mustard : COLORS.primary,
  };
}
