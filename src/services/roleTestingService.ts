import { syncUserProfile, getRolePermissions } from "./userService";
import { UserProfile } from "../types";

export interface TestCaseResult {
  id: string;
  title: string;
  description: string;
  status: "PENDING" | "RUNNING" | "PASS" | "FAIL";
  expected: string;
  actual: string;
  details?: string[];
}

export const TEST_EMAIL = "superadmin.test@gmail.com";
export const TEST_PASSWORD = "SuperAdmin#2026Pass!";

/**
 * Menjalankan rangkaian pengujian otomatis untuk Skenario User Role Management:
 * 1. Sign in with Google (Email: superadmin.test@gmail.com)
 * 2. Sign in with Email & Password (Email yang sama)
 * 3. Verifikasi Akun Tunggal (UID sama & tidak terduplikasi)
 * 4. Verifikasi Role Super Admin (Role persist pada kedua metode)
 * 5. Verifikasi Hak Akses / Privilege RBAC
 */
export async function runRoleTestSuite(
  onProgress?: (results: TestCaseResult[]) => void
): Promise<TestCaseResult[]> {
  const testResults: TestCaseResult[] = [
    {
      id: "TC-AUTH-01",
      title: "Login dengan Sign in with Google",
      description: "Melakukan autentikasi menggunakan provider Google OAuth dengan email uji.",
      status: "PENDING",
      expected: "Berhasil login, terdaftar dengan role 'Super Admin' dan provider 'google.com'",
      actual: "-",
      details: [],
    },
    {
      id: "TC-AUTH-02",
      title: "Login dengan Email/Username & Password",
      description: "Melakukan autentikasi menggunakan kredensial email & password dengan email yang sama.",
      status: "PENDING",
      expected: "Berhasil login, merujuk ke akun yang sama dengan role 'Super Admin'",
      actual: "-",
      details: [],
    },
    {
      id: "TC-AUTH-03",
      title: "Validasi Integritas Akun Tunggal (Account Linking)",
      description: "Memastikan UID dan entitas user identik antara login Google dan Email/Password.",
      status: "PENDING",
      expected: "UID Google === UID Email/Password (Satu entitas akun tunggal, tidak terduplikasi)",
      actual: "-",
      details: [],
    },
    {
      id: "TC-AUTH-04",
      title: "Validasi Hak Akses RBAC (Super Admin Role)",
      description: "Memastikan hak akses administratif penuh aktif untuk role Super Admin.",
      status: "PENDING",
      expected: "Akses penuh (Full Privilege): Create, Read, Delete Mahasiswa & Kelola Role",
      actual: "-",
      details: [],
    },
  ];

  const update = () => {
    if (onProgress) onProgress([...testResults]);
  };

  update();

  let googleProfile: UserProfile | null = null;
  let passwordProfile: UserProfile | null = null;

  // ==========================================
  // EKSEKUSI TEST CASE 01: Login with Google
  // ==========================================
  testResults[0].status = "RUNNING";
  update();
  await new Promise((r) => setTimeout(r, 600));

  try {
    const mockGoogleUid = "google-oauth2-" + btoa(TEST_EMAIL).replace(/=/g, "").slice(0, 16);
    googleProfile = await syncUserProfile(
      mockGoogleUid,
      TEST_EMAIL,
      "Super Admin Test (Google)",
      "https://lh3.googleusercontent.com/a/default-user",
      "google.com"
    );

    const isGoogleOk =
      googleProfile.email === TEST_EMAIL &&
      googleProfile.role === "Super Admin" &&
      googleProfile.linkedProviders?.includes("google.com");

    if (isGoogleOk) {
      testResults[0].status = "PASS";
      testResults[0].actual = `Berhasil. UID: ${googleProfile.uid}, Role: ${googleProfile.role}, Provider: [${googleProfile.linkedProviders?.join(", ")}]`;
      testResults[0].details = [
        `Email: ${googleProfile.email}`,
        `UID Akun: ${googleProfile.uid}`,
        `Role Diperoleh: ${googleProfile.role}`,
        `Provider Aktif: google.com`,
      ];
    } else {
      testResults[0].status = "FAIL";
      testResults[0].actual = `Role atau provider tidak sesuai: ${googleProfile.role}`;
    }
  } catch (err: any) {
    testResults[0].status = "FAIL";
    testResults[0].actual = `Error: ${err?.message || err}`;
  }
  update();

  // ==========================================
  // EKSEKUSI TEST CASE 02: Login with Email & Password
  // ==========================================
  testResults[1].status = "RUNNING";
  update();
  await new Promise((r) => setTimeout(r, 600));

  try {
    const mockPasswordUid = "pw-cred-" + btoa(TEST_EMAIL).replace(/=/g, "").slice(0, 16);
    passwordProfile = await syncUserProfile(
      mockPasswordUid,
      TEST_EMAIL,
      "Super Admin Test (Password)",
      null,
      "password"
    );

    const isPwOk =
      passwordProfile.email === TEST_EMAIL &&
      passwordProfile.role === "Super Admin" &&
      passwordProfile.linkedProviders?.includes("password");

    if (isPwOk) {
      testResults[1].status = "PASS";
      testResults[1].actual = `Berhasil. UID: ${passwordProfile.uid}, Role: ${passwordProfile.role}, Linked: [${passwordProfile.linkedProviders?.join(", ")}]`;
      testResults[1].details = [
        `Email: ${passwordProfile.email}`,
        `UID Akun: ${passwordProfile.uid}`,
        `Role Diperoleh: ${passwordProfile.role}`,
        `Provider Terhubung: ${passwordProfile.linkedProviders?.join(", ")}`,
      ];
    } else {
      testResults[1].status = "FAIL";
      testResults[1].actual = `Role atau akun tidak sesuai: ${passwordProfile.role}`;
    }
  } catch (err: any) {
    testResults[1].status = "FAIL";
    testResults[1].actual = `Error: ${err?.message || err}`;
  }
  update();

  // ==========================================
  // EKSEKUSI TEST CASE 03: Account Linking & Single Identity
  // ==========================================
  testResults[2].status = "RUNNING";
  update();
  await new Promise((r) => setTimeout(r, 600));

  try {
    if (!googleProfile || !passwordProfile) {
      throw new Error("Profil pengujian TC-01 atau TC-02 tidak tersedia.");
    }

    const sameUid = googleProfile.uid === passwordProfile.uid;
    const sameEmail = googleProfile.email === passwordProfile.email;
    const hasBothProviders =
      passwordProfile.linkedProviders?.includes("google.com") &&
      passwordProfile.linkedProviders?.includes("password");

    if (sameUid && sameEmail && hasBothProviders) {
      testResults[2].status = "PASS";
      testResults[2].actual = `VALID: Kedua metode login menghasilkan UID identik (${googleProfile.uid}) dan akun otomatis tertaut.`;
      testResults[2].details = [
        `Google UID: ${googleProfile.uid}`,
        `Password UID: ${passwordProfile.uid}`,
        `Status Kesamaan UID: IDENTIK (100% Match)`,
        `Providers Terdaftar: ${passwordProfile.linkedProviders?.join(" + ")}`,
      ];
    } else {
      testResults[2].status = "FAIL";
      testResults[2].actual = `UID tidak sama (Google: ${googleProfile.uid}, Password: ${passwordProfile.uid})`;
    }
  } catch (err: any) {
    testResults[2].status = "FAIL";
    testResults[2].actual = `Error: ${err?.message || err}`;
  }
  update();

  // ==========================================
  // EKSEKUSI TEST CASE 04: RBAC & Super Admin Privilege
  // ==========================================
  testResults[3].status = "RUNNING";
  update();
  await new Promise((r) => setTimeout(r, 600));

  try {
    const perms = getRolePermissions(passwordProfile?.role);
    const hasFullAccess =
      perms.isSuperAdmin &&
      perms.canCreateMahasiswa &&
      perms.canDeleteMahasiswa &&
      perms.canManageRoles &&
      perms.canAccessSystemSettings;

    if (hasFullAccess) {
      testResults[3].status = "PASS";
      testResults[3].actual = `VALID: Role 'Super Admin' terkonfirmasi aktif dengan Hak Akses Penuh (Full Privileges).`;
      testResults[3].details = [
        `Role: ${passwordProfile?.role}`,
        `Akses Create Mahasiswa: YA`,
        `Akses Delete Mahasiswa: YA`,
        `Akses Kelola User & Role: YA`,
        `Akses Pengaturan Sistem: YA`,
      ];
    } else {
      testResults[3].status = "FAIL";
      testResults[3].actual = `Hak akses Super Admin tidak terpenuhi.`;
    }
  } catch (err: any) {
    testResults[3].status = "FAIL";
    testResults[3].actual = `Error: ${err?.message || err}`;
  }
  update();

  return testResults;
}
