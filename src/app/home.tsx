import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth } from "../config/firebaseConfig";
import { clearAuthSession, getAuthSession } from "../services/authStorage";
import {
  addMahasiswa,
  deduplicateMahasiswa,
  deleteMahasiswa,
  subscribeMahasiswaList,
} from "../services/mahasiswaService";
import { Mahasiswa, UserProfile } from "../types";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);

  // Form input state
  const [nim, setNim] = useState("");
  const [nama, setNama] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Verifikasi Sesi Token di Local Storage saat halaman dimuat
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const session = await getAuthSession();
      if (!session.token || !session.user) {
        console.log("[Home] Tidak ada sesi token. Mengalihkan ke login...");
        if (Platform.OS === "web") {
          window.location.href = "/";
        } else if (isMounted) {
          router.replace("/" as any);
        }
        return;
      }

      if (isMounted) {
        setUser(session.user);
        setSessionReady(true);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Berlangganan Data Mahasiswa (Realtime Firestore & Lokal)
  useEffect(() => {
    if (!sessionReady) return;

    const unsubscribe = subscribeMahasiswaList((data) => {
      setMahasiswaList(data);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionReady]);

  /**
   * TOMBOL KELUAR / LOGOUT:
   * Eksekusi sinkron dan langsung membersihkan seluruh storage
   * lalu mengarahkan seketika ke halaman login tanpa menunggu respon server.
   */
  const handleLogout = () => {
    console.log("[Auth] Memulai proses logout...");

    // 1. Bersihkan localStorage di browser langsung
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (_) {}

    // 2. Bersihkan AsyncStorage & MMKV
    clearAuthSession().catch(() => {});

    // 3. Sign out dari Firebase Auth di latar belakang
    try {
      signOut(auth).catch(() => {});
    } catch (_) {}

    console.log("[Auth] Storage bersih. Mengarahkan ke halaman login...");

    // 4. Langsung alihkan ke login seketika
    if (Platform.OS === "web") {
      window.location.href = "/";
    } else {
      router.replace("/" as any);
    }
  };

  /**
   * KETENTUAN 4:
   * Input data mahasiswa ke database.
   * Menambahkan data baru ke daftar (bertambah, tidak menimpa data sebelumnya).
   */
  const handleAdd = async () => {
    if (!nim.trim() || !nama.trim() || !jurusan.trim() || !angkatan.trim()) {
      setFormError("Semua kolom (NIM, Nama, Jurusan, Angkatan) wajib diisi.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const added = await addMahasiswa({
        nim: nim.trim(),
        nama: nama.trim(),
        jurusan: jurusan.trim(),
        angkatan: angkatan.trim(),
      });

      // Tambahkan item baru dan pastikan bebas duplikat berdasarkan NIM & Nama
      setMahasiswaList((prev) => deduplicateMahasiswa([added, ...prev]));

      // Reset form input
      setNim("");
      setNama("");
      setJurusan("");
      setAngkatan("");
    } catch (err: any) {
      setFormError(err?.message || "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Hapus data mahasiswa
   */
  const handleDelete = async (id?: string, studentNim?: string) => {
    if (!id) return;
    await deleteMahasiswa(id, studentNim);
    setMahasiswaList((prev) =>
      prev.filter(
        (m) =>
          m.id !== id &&
          (!studentNim || String(m.nim).trim() !== String(studentNim).trim())
      )
    );
  };

  if (!sessionReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0052cc" />
        <Text style={styles.loadingText}>Memeriksa sesi akun...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.greetingText}>
              Halo, {user?.displayName || "Mahasiswa"}
            </Text>
            <Text style={styles.emailText}>{user?.email || "Akun Terverifikasi"}</Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityRole="button"
          >
            <Text style={styles.logoutButtonText}>Keluar</Text>
          </Pressable>
        </View>

        {/* Form Input Mahasiswa (Ketentuan 4) */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Input Data Mahasiswa</Text>

          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              placeholder="NIM"
              value={nim}
              onChangeText={setNim}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Nama Lengkap"
              value={nama}
              onChangeText={setNama}
            />
          </View>

          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              placeholder="Jurusan / Program Studi"
              value={jurusan}
              onChangeText={setJurusan}
            />
            <TextInput
              style={styles.input}
              placeholder="Tahun Angkatan"
              value={angkatan}
              onChangeText={setAngkatan}
              keyboardType="numeric"
            />
          </View>

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          <Pressable
            style={[styles.saveButton, submitting && styles.disabledButton]}
            onPress={handleAdd}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Simpan Mahasiswa</Text>
            )}
          </Pressable>
        </View>

        {/* KETENTUAN 5: Tampilan List Mahasiswa yang ada pada database */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            Daftar Mahasiswa ({mahasiswaList.length})
          </Text>

          <FlatList
            data={deduplicateMahasiswa(mahasiswaList)}
            keyExtractor={(item, index) => item.nim || item.id || `mhs-${index}`}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.studentItem}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>
                    {item.nim} - {item.nama}
                  </Text>
                  <Text style={styles.studentMeta}>
                    {item.jurusan} | Angkatan {item.angkatan}
                  </Text>
                </View>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id, item.nim)}
                  accessibilityRole="button"
                >
                  <Text style={styles.deleteButtonText}>Hapus</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Tidak ada data mahasiswa.</Text>
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
    alignItems: "center",
  },
  content: {
    width: "100%",
    maxWidth: 680,
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f5f7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#5e6c84",
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe1e6",
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#172b4d",
  },
  emailText: {
    fontSize: 13,
    color: "#5e6c84",
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "#ffebe6",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ffbdad",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  logoutButtonText: {
    color: "#de350b",
    fontSize: 14,
    fontWeight: "bold",
  },
  formCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe1e6",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#172b4d",
    marginBottom: 12,
  },
  formRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#fafbfc",
    borderWidth: 1,
    borderColor: "#dfe1e6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#172b4d",
  },
  errorText: {
    color: "#de350b",
    fontSize: 13,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#0052cc",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 4,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  listSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe1e6",
  },
  listContainer: {
    paddingBottom: 16,
  },
  studentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ebecf0",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#172b4d",
  },
  studentMeta: {
    fontSize: 13,
    color: "#5e6c84",
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: "#f4f5f7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#dfe1e6",
    marginLeft: 10,
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : {}),
  },
  deleteButtonText: {
    color: "#de350b",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#5e6c84",
    marginTop: 24,
    fontSize: 14,
  },
});
