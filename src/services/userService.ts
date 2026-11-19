import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, isFirebaseConfigured } from "../config/firebaseConfig";
import { COLORS } from "../constants/theme";
import { UserProfile, UserRole } from "../types";

const USERS_COLLECTION = "users";
const USER_CACHE_PREFIX = "@user_profile_";
const IDENTITY_DIRECTORY_KEY = "@user_identity_directory";

const CANONICAL_EMAIL_BY_IDENTIFIER: Record<string, string> = {
  "yumatamahazza@gmail.com": "yumatamahazza@gmail.com",
  "yumahazza@portal.local": "yumatamahazza@gmail.com",
  "yumatamahazza@portal.local": "yumatamahazza@gmail.com",
  "yumahazzayuditama@portal.local": "yumatamahazza@gmail.com",
  yumahazza: "yumatamahazza@gmail.com",
  yumatamahazza: "yumatamahazza@gmail.com",
  "yuma hazza yuditama": "yumatamahazza@gmail.com",
  yumahazzayuditama: "yumatamahazza@gmail.com",
};

const CANONICAL_USERNAMES: Record<string, string> = {
  "yumatamahazza@gmail.com": "yumahazza",
  "yumahazza@portal.local": "yumahazza",
  "yumatamahazza@portal.local": "yumahazza",
  "yumahazzayuditama@portal.local": "yumahazza",
  yumahazza: "yumahazza",
  yumatamahazza: "yumahazza",
  "yuma hazza yuditama": "yumahazza",
  yumahazzayuditama: "yumahazza",
};

const SUPER_ADMIN_EMAILS = new Set([
  "yumatamahazza@gmail.com",
  "yumahazza@portal.local",
  "yumatamahazza@portal.local",
  "yumahazzayuditama@portal.local",
  "superadmin.test@gmail.com",
]);

function normalizeTextKey(value?: string | null): string {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function compactAliasKey(value?: string | null): string {
  return normalizeTextKey(value).replace(/[^a-z0-9]/g, "");
}

function sanitizeEmailSlug(value?: string | null): string {
  return normalizeTextKey(value).replace(/[^a-z0-9._-]/g, "");
}

/**
 * Membuat kunci unik yang aman berdasarkan alamat email untuk pencocokan akun tunggal.
 */
function sanitizeEmailKey(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, "_");
}

function isSyntheticLocalUid(uid?: string | null): boolean {
  return Boolean(uid && uid.startsWith("usr-"));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mergeStoredProfiles(
  cached: UserProfile | null,
  remote: UserProfile | null
): UserProfile | null {
  if (!cached) return remote;
  if (!remote) return cached;

  const preferRemoteUid =
    isSyntheticLocalUid(cached.uid) && !isSyntheticLocalUid(remote.uid);

  const mergedProviders = Array.from(
    new Set([...(remote.linkedProviders || []), ...(cached.linkedProviders || [])])
  );
  const mergedAliases = Array.from(
    new Set([...(remote.aliases || []), ...(cached.aliases || [])])
  );

  return {
    ...remote,
    ...cached,
    uid: preferRemoteUid ? remote.uid : cached.uid || remote.uid,
    displayName: cached.displayName || remote.displayName,
    googleDisplayName: cached.googleDisplayName || remote.googleDisplayName || null,
    photoURL: cached.photoURL || remote.photoURL || null,
    linkedProviders: mergedProviders,
    aliases: mergedAliases,
    hasFirebasePassword: Boolean(cached.hasFirebasePassword || remote.hasFirebasePassword),
  };
}

/**
 * Menyeragamkan alamat email kanonik agar login manual via username/nama Google
 * mengarah ke email akun Google yang sama.
 */
export function normalizeCanonicalEmail(
  email?: string | null,
  displayName?: string | null
): string | null {
  const normalizedEmail = normalizeTextKey(email);
  if (normalizedEmail && CANONICAL_EMAIL_BY_IDENTIFIER[normalizedEmail]) {
    return CANONICAL_EMAIL_BY_IDENTIFIER[normalizedEmail];
  }

  if (!normalizedEmail || normalizedEmail.endsWith("@portal.local")) {
    const cleanName = normalizeTextKey(displayName);
    const compactName = compactAliasKey(displayName);
    if (cleanName && CANONICAL_EMAIL_BY_IDENTIFIER[cleanName]) {
      return CANONICAL_EMAIL_BY_IDENTIFIER[cleanName];
    }
    if (compactName && CANONICAL_EMAIL_BY_IDENTIFIER[compactName]) {
      return CANONICAL_EMAIL_BY_IDENTIFIER[compactName];
    }
  }

  return normalizedEmail || null;
}

/**
 * Menentukan role pengguna secara konsisten.
 * Akun dengan username 'yumahazza' (baik sign-in biasa maupun Google) otomatis berstatus Super Admin.
 */
export function resolveUserRole(
  email?: string | null,
  displayName?: string | null,
  existingRole?: UserRole
): UserRole {
  const canonicalEmail = normalizeCanonicalEmail(email, displayName) || "";
  const normalizedName = normalizeTextKey(displayName);

  if (
    normalizedName === "yumahazza" ||
    SUPER_ADMIN_EMAILS.has(canonicalEmail)
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
  const canonicalEmail = normalizeCanonicalEmail(email, candidateName || existingName) || "";
  if (canonicalEmail && CANONICAL_USERNAMES[canonicalEmail]) {
    return CANONICAL_USERNAMES[canonicalEmail];
  }

  for (const rawName of [candidateName, existingName]) {
    const clean = normalizeTextKey(rawName);
    const compact = compactAliasKey(rawName);
    if (clean && CANONICAL_USERNAMES[clean]) {
      return CANONICAL_USERNAMES[clean];
    }
    if (compact && CANONICAL_USERNAMES[compact]) {
      return CANONICAL_USERNAMES[compact];
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

  return canonicalEmail.split("@")[0] || "Mahasiswa";
}

function buildAliases(
  email: string,
  candidates: (string | null | undefined)[]
): string[] {
  const aliasSet = new Set<string>();
  const cleanEmail = normalizeTextKey(email);
  if (cleanEmail) {
    aliasSet.add(cleanEmail);
    const localPart = cleanEmail.split("@")[0];
    if (localPart) {
      aliasSet.add(localPart);
    }
  }

  for (const candidate of candidates) {
    const clean = normalizeTextKey(candidate);
    if (!clean || clean === "pengguna google") continue;
    aliasSet.add(clean);
    const compact = compactAliasKey(clean);
    if (compact) {
      aliasSet.add(compact);
    }
  }

  return Array.from(aliasSet);
}

async function readIdentityDirectory(): Promise<Record<string, string>> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const rawWeb = window.localStorage.getItem(IDENTITY_DIRECTORY_KEY);
      if (rawWeb) {
        return JSON.parse(rawWeb) as Record<string, string>;
      }
    }
    const raw = await AsyncStorage.getItem(IDENTITY_DIRECTORY_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, string>;
    }
  } catch {
    // Abaikan jika direktori lokal belum ada atau corrupt
  }
  return {};
}

async function registerIdentityAliases(
  email: string,
  aliases: string[]
): Promise<void> {
  const cleanEmail = normalizeTextKey(email);
  if (!cleanEmail || cleanEmail.endsWith("@portal.local")) return;

  try {
    const directory = await readIdentityDirectory();
    let changed = false;

    for (const alias of aliases) {
      const key = normalizeTextKey(alias);
      if (key && directory[key] !== cleanEmail) {
        directory[key] = cleanEmail;
        changed = true;
      }
      const compact = compactAliasKey(alias);
      if (compact && directory[compact] !== cleanEmail) {
        directory[compact] = cleanEmail;
        changed = true;
      }
    }

    if (changed) {
      const serialized = JSON.stringify(directory);
      await AsyncStorage.setItem(IDENTITY_DIRECTORY_KEY, serialized);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(IDENTITY_DIRECTORY_KEY, serialized);
      }
    }
  } catch {
    // Jangan gagalkan proses login bila penyimpanan direktori lokal gagal
  }
}

export async function getUserProfileByEmail(
  email?: string | null
): Promise<UserProfile | null> {
  const canonicalEmail = normalizeCanonicalEmail(email);
  if (!canonicalEmail) return null;

  const emailKey = sanitizeEmailKey(canonicalEmail);
  const cacheKey = `${USER_CACHE_PREFIX}${emailKey}`;

  let cachedProfile: UserProfile | null = null;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      cachedProfile = JSON.parse(cached) as UserProfile;
    }
  } catch {
    cachedProfile = null;
  }

  if (cachedProfile) {
    return cachedProfile;
  }

  if (isFirebaseConfigured()) {
    try {
      const userDoc = await withTimeout(getDoc(doc(db, USERS_COLLECTION, emailKey)), 2500);
      if (userDoc && userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
    } catch {
      // Abaikan jika offline atau akses Firestore dibatasi sebelum auth
    }
  }

  return null;
}

export interface LoginIdentityResolution {
  email: string;
  matchedFromDirectory: boolean;
  isSyntheticLocal: boolean;
}

/**
 * Menyelesaikan input username atau email (mis. "Yuma Hazza Yuditama", "yumahazza",
 * atau nama tampilan akun Google lain yang pernah login) ke email akun yang sebenarnya.
 */
export async function resolveLoginIdentity(
  identifier: string
): Promise<LoginIdentityResolution> {
  const clean = identifier.trim();
  const lower = normalizeTextKey(clean);
  const compact = compactAliasKey(clean);

  if (clean.includes("@")) {
    const canonical = CANONICAL_EMAIL_BY_IDENTIFIER[lower] || lower;
    return {
      email: canonical,
      matchedFromDirectory: Boolean(CANONICAL_EMAIL_BY_IDENTIFIER[lower]),
      isSyntheticLocal: canonical.endsWith("@portal.local"),
    };
  }

  // 1. Peta alias statis kanonik (langsung bekerja tanpa ketergantungan cache lokal)
  const staticEmail =
    CANONICAL_EMAIL_BY_IDENTIFIER[lower] || CANONICAL_EMAIL_BY_IDENTIFIER[compact];
  if (staticEmail) {
    return {
      email: staticEmail,
      matchedFromDirectory: true,
      isSyntheticLocal: false,
    };
  }

  // 2. Direktori identitas lokal (terisi saat login Google maupun manual sebelumnya)
  const directory = await readIdentityDirectory();
  const localMatch = directory[lower] || (compact ? directory[compact] : undefined);
  if (localMatch) {
    return {
      email: localMatch,
      matchedFromDirectory: true,
      isSyntheticLocal: localMatch.endsWith("@portal.local"),
    };
  }

  // 3. Lookup ke koleksi Firestore `users` berdasarkan aliases jika tersedia
  if (isFirebaseConfigured()) {
    const lookupKeys = compact && compact !== lower ? [lower, compact] : [lower];
    for (const key of lookupKeys) {
      if (!key) continue;
      try {
        const snap = await withTimeout(
          getDocs(
            query(
              collection(db, USERS_COLLECTION),
              where("aliases", "array-contains", key),
              limit(1)
            )
          ),
          2500
        );
        if (snap && !snap.empty) {
          const data = snap.docs[0].data() as Partial<UserProfile>;
          const foundEmail = normalizeCanonicalEmail(data.email);
          if (foundEmail) {
            await registerIdentityAliases(
              foundEmail,
              buildAliases(foundEmail, [
                clean,
                data.displayName,
                data.googleDisplayName,
                ...(data.aliases || []),
              ])
            );
            return {
              email: foundEmail,
              matchedFromDirectory: true,
              isSyntheticLocal: foundEmail.endsWith("@portal.local"),
            };
          }
        }
      } catch {
        // Abaikan bila rules Firestore membatasi pembacaan sebelum login atau sedang offline
      }
    }
  }

  const slug = sanitizeEmailSlug(clean) || "user";
  return {
    email: `${slug}@portal.local`,
    matchedFromDirectory: false,
    isSyntheticLocal: true,
  };
}

export interface SyncUserProfileOptions {
  hasFirebasePassword?: boolean;
}

/**
 * Menyimpan atau memperbarui profil pengguna terpadu (Unified Account Identity).
 * Memastikan bahwa akun dengan email yang sama selalu memiliki UID yang konsisten,
 * role "Super Admin" untuk yumahazza, serta riwayat provider & alias yang terhubung.
 */
export async function syncUserProfile(
  authUid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  providerId: string = "unknown",
  options?: SyncUserProfileOptions
): Promise<UserProfile> {
  const canonicalEmail = normalizeCanonicalEmail(email, displayName);
  const normalizedEmail = canonicalEmail || `user_${authUid}@example.com`;
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

  // 2. Coba baca dari Firestore jika dikonfigurasi dan gabungkan secara aman
  if (isFirebaseConfigured()) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, emailKey);
      const userDoc = await withTimeout(getDoc(userDocRef), 2500);
      if (userDoc && userDoc.exists()) {
        existingProfile = mergeStoredProfiles(
          existingProfile,
          userDoc.data() as UserProfile
        );
      }
    } catch (err) {
      console.warn("[UserService] Gagal membaca user dari Firestore:", err);
    }
  }

  // 3. Tentukan identitas akun tunggal (Canonical UID & Providers)
  const shouldUpgradeSyntheticUid =
    isSyntheticLocalUid(existingProfile?.uid) && !isSyntheticLocalUid(authUid);
  const canonicalUid =
    !existingProfile?.uid || shouldUpgradeSyntheticUid
      ? authUid
      : existingProfile.uid;

  const currentProviders = new Set<string>(existingProfile?.linkedProviders || []);
  if (providerId) {
    currentProviders.add(providerId);
  }
  if (existingProfile?.providerId) {
    currentProviders.add(existingProfile.providerId);
  }

  const incomingGoogleName =
    providerId === "google.com" &&
    displayName &&
    normalizeTextKey(displayName) !== "pengguna google"
      ? displayName.trim()
      : null;
  const googleDisplayName =
    incomingGoogleName || existingProfile?.googleDisplayName || null;

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

  const aliases = buildAliases(normalizedEmail, [
    displayName,
    resolvedDisplayName,
    googleDisplayName,
    ...(existingProfile?.aliases || []),
  ]);

  const hasFirebasePassword = Boolean(
    options?.hasFirebasePassword || existingProfile?.hasFirebasePassword
  );

  const resolvedProfile: UserProfile = {
    uid: canonicalUid,
    email: normalizedEmail,
    displayName: resolvedDisplayName,
    photoURL: photoURL || existingProfile?.photoURL || null,
    providerId: providerId,
    role: assignedRole,
    linkedProviders: Array.from(currentProviders),
    googleDisplayName,
    aliases,
    hasFirebasePassword,
  };

  // 4. Simpan ke Cache Lokal & Direktori Alias
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(resolvedProfile));
  } catch (err) {
    console.warn("[UserService] Gagal menyimpan cache user:", err);
  }
  await registerIdentityAliases(normalizedEmail, aliases);

  // 5. Simpan ke Firestore untuk persistensi Cloud
  if (isFirebaseConfigured()) {
    try {
      const userDocRef = doc(db, USERS_COLLECTION, emailKey);
      await withTimeout(
        setDoc(
          userDocRef,
          {
            ...resolvedProfile,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        3000
      );
    } catch (err) {
      console.warn("[UserService] Gagal menyinkronkan user ke Firestore:", err);
    }
  }

  console.log(
    `[UserService] Akun tersinkronisasi: [${resolvedProfile.email}] UID: ${resolvedProfile.uid} Role: ${resolvedProfile.role}`
  );
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
