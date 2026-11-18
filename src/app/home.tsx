import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { ComponentRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../config/firebaseConfig";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
} from "../constants/theme";
import { clearAuthSession, getAuthSession } from "../services/authStorage";
import {
  addMahasiswa,
  deduplicateMahasiswa,
  deleteMahasiswa,
  subscribeMahasiswaList,
} from "../services/mahasiswaService";
import { Mahasiswa, UserProfile } from "../types";

type ActiveHomeField = "nim" | "angkatan" | "nama" | "jurusan" | null;

export default function HomePage() {
  const router = useRouter();
  const angkatanRef = useRef<ComponentRef<typeof TextInput>>(null);
  const namaRef = useRef<ComponentRef<typeof TextInput>>(null);
  const jurusanRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);

  // Form input state
  const [nim, setNim] = useState("");
  const [nama, setNama] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [focusedField, setFocusedField] = useState<ActiveHomeField>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const session = await getAuthSession();
      if (!session.token || !session.user) {
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

  useEffect(() => {
    if (!sessionReady) return;

    const unsubscribe = subscribeMahasiswaList((data) => {
      setMahasiswaList(deduplicateMahasiswa(data));
    });

    return () => {
      unsubscribe();
    };
  }, [sessionReady]);

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {}

    clearAuthSession().catch(() => {});

    try {
      signOut(auth).catch(() => {});
    } catch {}

    if (Platform.OS === "web") {
      window.location.href = "/";
    } else {
      router.replace("/" as any);
    }
  };

  const handleAdd = async () => {
    if (submitting) return;

    if (!nim.trim() || !nama.trim() || !jurusan.trim() || !angkatan.trim()) {
      setFormError("Lengkapi NIM, angkatan, nama lengkap, dan jurusan terlebih dahulu.");
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

      setMahasiswaList((prev) => deduplicateMahasiswa([added, ...prev]));

      setNim("");
      setNama("");
      setJurusan("");
      setAngkatan("");
    } catch (err: any) {
      setFormError(err?.message || "Gagal menyimpan data mahasiswa.");
    } finally {
      setSubmitting(false);
    }
  };

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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={COLORS.ink} />
          <Text style={styles.loadingText}>Memuat data sesi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const providerLabel = user?.providerId === "google.com" ? "Google" : "Manual";
  const cleanStudents = deduplicateMahasiswa(mahasiswaList);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Sapaan & Identitas Pengguna */}
      <View style={styles.topBar}>
        <View style={styles.identityBlock}>
          <View style={styles.statusLine}>
            <View style={styles.statusDotPrimary} />
            <Text style={styles.statusText}>Sesi aktif · {providerLabel}</Text>
            {user?.role ? (
              <>
                <Text style={styles.statusSeparator}>/</Text>
                <View style={styles.statusDotHighlight} />
                <Text style={styles.roleHighlightText}>{user.role}</Text>
              </>
            ) : null}
          </View>
          <Text style={styles.greetingText} numberOfLines={1}>
            Halo, {user?.displayName || "Mahasiswa"}
          </Text>
          <Text style={styles.emailText} numberOfLines={1}>
            {user?.email || "Akun terverifikasi"}
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
        >
          <Text style={styles.logoutButtonText}>Keluar</Text>
        </Pressable>
      </View>

      {/* Satu Kelompok Mandiri: Form Input Data Mahasiswa */}
      <View style={styles.formSurface}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Tambah Mahasiswa</Text>
          <Text style={styles.formSubtitle}>
            Data baru langsung tersinkron ke daftar mahasiswa.
          </Text>
        </View>

        <View style={styles.rowPair}>
          <View style={styles.colNim}>
            <Text style={styles.inputLabel}>NIM</Text>
            <TextInput
              style={[styles.input, focusedField === "nim" && styles.inputFocused]}
              placeholder="Contoh: 1201223045"
              placeholderTextColor={COLORS.inkMuted}
              value={nim}
              onChangeText={(val) => {
                setNim(val);
                if (formError) setFormError(null);
              }}
              onFocus={() => setFocusedField("nim")}
              onBlur={() => setFocusedField(null)}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => angkatanRef.current?.focus()}
              editable={!submitting}
            />
          </View>

          <View style={styles.colAngkatan}>
            <Text style={styles.inputLabel}>Angkatan</Text>
            <TextInput
              ref={angkatanRef}
              style={[
                styles.input,
                focusedField === "angkatan" && styles.inputFocused,
              ]}
              placeholder="2024"
              placeholderTextColor={COLORS.inkMuted}
              value={angkatan}
              onChangeText={(val) => {
                setAngkatan(val);
                if (formError) setFormError(null);
              }}
              onFocus={() => setFocusedField("angkatan")}
              onBlur={() => setFocusedField(null)}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => namaRef.current?.focus()}
              editable={!submitting}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nama Lengkap</Text>
          <TextInput
            ref={namaRef}
            style={[styles.input, focusedField === "nama" && styles.inputFocused]}
            placeholder="Masukkan nama mahasiswa"
            placeholderTextColor={COLORS.inkMuted}
            value={nama}
            onChangeText={(val) => {
              setNama(val);
              if (formError) setFormError(null);
            }}
            onFocus={() => setFocusedField("nama")}
            onBlur={() => setFocusedField(null)}
            returnKeyType="next"
            onSubmitEditing={() => jurusanRef.current?.focus()}
            editable={!submitting}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Jurusan / Program Studi</Text>
          <TextInput
            ref={jurusanRef}
            style={[
              styles.input,
              focusedField === "jurusan" && styles.inputFocused,
            ]}
            placeholder="Contoh: S1 Rekayasa Perangkat Lunak"
            placeholderTextColor={COLORS.inkMuted}
            value={jurusan}
            onChangeText={(val) => {
              setJurusan(val);
              if (formError) setFormError(null);
            }}
            onFocus={() => setFocusedField("jurusan")}
            onBlur={() => setFocusedField(null)}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            editable={!submitting}
          />
        </View>

        {formError ? (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleAdd}
          disabled={submitting}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !submitting && styles.saveButtonPressed,
            submitting && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting, busy: submitting }}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.ink} size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Simpan Mahasiswa</Text>
          )}
        </Pressable>
      </View>

      {/* Header Daftar Mahasiswa */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listTitle}>Daftar Mahasiswa</Text>
        <Text style={styles.listCount}>{cleanStudents.length} tercatat</Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerBlock}>
      <Pressable
        onPress={() => router.push("/test-role" as any)}
        style={styles.footerLinkButton}
        accessibilityRole="button"
      >
        <Text style={styles.footerLinkText}>Verifikasi integritas role akun</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          data={cleanStudents}
          keyExtractor={(item, index) => item.nim || item.id || `mhs-${index}`}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.nama}</Text>
                <Text style={styles.studentMeta}>
                  {item.nim} · {item.jurusan} · Angkatan {item.angkatan}
                </Text>
              </View>

              <Pressable
                onPress={() => handleDelete(item.id, item.nim)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Hapus ${item.nama}`}
              >
                <Text style={styles.deleteButtonText}>Hapus</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Belum ada data mahasiswa tersimpan.</Text>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  loadingText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    color: COLORS.inkMuted,
  },
  listContent: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  headerWrapper: {
    marginBottom: SPACING.xs,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  identityBlock: {
    flex: 1,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  statusDotPrimary: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  statusText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  statusSeparator: {
    fontFamily: FONTS.family,
    fontSize: 12,
    color: COLORS.border,
    marginHorizontal: 6,
  },
  statusDotHighlight: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
    marginRight: 6,
  },
  roleHighlightText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 12,
    color: COLORS.orangeInk,
  },
  greetingText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.ink,
  },
  emailText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  logoutButton: {
    minHeight: 44,
    minWidth: 72,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...(WEB_POINTER || {}),
  },
  logoutButtonPressed: {
    backgroundColor: COLORS.coralSurface,
    borderColor: COLORS.coral,
  },
  logoutButtonText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 13,
    color: COLORS.coralInk,
  },
  formSurface: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  formHeader: {
    marginBottom: SPACING.md,
  },
  formTitle: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.ink,
  },
  formSubtitle: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  rowPair: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: 12,
  },
  colNim: {
    flex: 1.4,
  },
  colAngkatan: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: 12,
    color: COLORS.ink,
    marginBottom: 4,
  },
  input: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.surfaceInput,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  errorBanner: {
    backgroundColor: COLORS.coralSurface,
    borderWidth: 1,
    borderColor: COLORS.coral,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.coralInk,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    minHeight: 46,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    ...(WEB_POINTER || {}),
  },
  saveButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listTitle: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 17,
    color: COLORS.ink,
  },
  listCount: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: 13,
    color: COLORS.inkMuted,
  },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.ink,
  },
  studentMeta: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkMuted,
    marginTop: 2,
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  deleteButtonPressed: {
    backgroundColor: COLORS.coralSurface,
  },
  deleteButtonText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: 13,
    color: COLORS.coralInk,
  },
  emptyBox: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    color: COLORS.inkMuted,
  },
  footerBlock: {
    paddingTop: SPACING.lg,
    alignItems: "flex-start",
  },
  footerLinkButton: {
    minHeight: 44,
    justifyContent: "center",
    ...(WEB_POINTER || {}),
  },
  footerLinkText: {
    fontFamily: FONTS.family,
    fontWeight: FONT_WEIGHTS.medium,
    fontSize: 13,
    color: COLORS.inkMuted,
    textDecorationLine: "underline",
  },
});
