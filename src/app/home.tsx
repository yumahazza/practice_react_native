import { useRouter } from "expo-router";
import { ComponentRef, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppShellHeader } from "../components/AppShellHeader";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
  retroOffset,
} from "../constants/theme";
import { getAuthSession } from "../services/authStorage";
import {
  addMahasiswa,
  deduplicateMahasiswa,
  deleteMahasiswa,
  subscribeMahasiswaList,
  updateMahasiswa,
} from "../services/mahasiswaService";
import { Mahasiswa, UserProfile } from "../types";

type FormField = "nama" | "nim" | "angkatan" | "jurusan";

interface FieldErrors {
  nama?: string;
  nim?: string;
  angkatan?: string;
  jurusan?: string;
}

interface FeedbackBanner {
  type: "success" | "info";
  message: string;
}

export default function HomePage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;
  const isCompactMobile = width < 560;

  const scrollViewRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const namaRef = useRef<ComponentRef<typeof TextInput>>(null);
  const nimRef = useRef<ComponentRef<typeof TextInput>>(null);
  const angkatanRef = useRef<ComponentRef<typeof TextInput>>(null);
  const jurusanRef = useRef<ComponentRef<typeof TextInput>>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);

  // CRUD Form State
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [focusedField, setFocusedField] = useState<FormField | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Edit & Delete State
  const [editingStudent, setEditingStudent] = useState<Mahasiswa | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Mahasiswa | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);

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

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const showFeedback = (type: FeedbackBanner["type"], message: string) => {
    setFeedback({ type, message });
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setNama("");
    setNim("");
    setAngkatan("");
    setJurusan("");
    setFieldErrors({});
  };

  const validateForm = (): FieldErrors => {
    const errors: FieldErrors = {};
    const cleanNama = nama.trim();
    const cleanNim = nim.trim();
    const cleanAngkatan = angkatan.trim();
    const cleanJurusan = jurusan.trim();

    if (!cleanNama) {
      errors.nama = "Nama mahasiswa wajib diisi.";
    } else if (cleanNama.length < 2) {
      errors.nama = "Nama mahasiswa minimal 2 karakter.";
    }

    if (!cleanNim) {
      errors.nim = "NIM wajib diisi.";
    } else if (!/^\d+$/.test(cleanNim)) {
      errors.nim = "NIM hanya boleh berisi angka.";
    } else if (cleanNim.length < 6 || cleanNim.length > 15) {
      errors.nim = "NIM harus terdiri dari 6 sampai 15 digit.";
    } else {
      const duplicateNim = mahasiswaList.some((m) => {
        const isSelf =
          editingStudent &&
          (m.id === editingStudent.id || m.nim.trim() === editingStudent.nim.trim());
        return !isSelf && m.nim.trim() === cleanNim;
      });
      if (duplicateNim) {
        errors.nim = `NIM ${cleanNim} sudah terdaftar pada mahasiswa lain.`;
      }
    }

    if (!cleanAngkatan) {
      errors.angkatan = "Tahun angkatan wajib diisi.";
    } else if (!/^\d{4}$/.test(cleanAngkatan)) {
      errors.angkatan = "Angkatan harus berupa 4 digit tahun (mis. 2024).";
    } else {
      const yearNum = Number(cleanAngkatan);
      if (yearNum < 1990 || yearNum > 2030) {
        errors.angkatan = "Tahun angkatan harus di antara 1990 hingga 2030.";
      }
    }

    if (!cleanJurusan) {
      errors.jurusan = "Jurusan wajib diisi.";
    } else if (cleanJurusan.length < 2) {
      errors.jurusan = "Jurusan minimal 2 karakter.";
    }

    return errors;
  };

  const clearSingleFieldError = (field: FormField) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmitForm = async () => {
    if (submitting) return;

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    const payload = {
      nama: nama.trim(),
      nim: nim.trim(),
      angkatan: angkatan.trim(),
      jurusan: jurusan.trim(),
    };

    try {
      if (editingStudent) {
        const originalId = editingStudent.id || editingStudent.nim;
        const originalNim = editingStudent.nim;
        const updated = await updateMahasiswa(originalId, originalNim, payload);

        setMahasiswaList((prev) =>
          deduplicateMahasiswa(
            prev.map((m) =>
              m.id === originalId || m.nim === originalNim ? updated : m
            )
          )
        );

        resetForm();
        showFeedback("success", `Data ${updated.nama} berhasil diperbarui.`);
      } else {
        const added = await addMahasiswa(payload);
        setMahasiswaList((prev) => deduplicateMahasiswa([added, ...prev]));
        resetForm();
        showFeedback("success", `${added.nama} ditambahkan ke daftar.`);
      }
    } catch (err: any) {
      setFieldErrors({
        nama: err?.message || "Gagal menyimpan data mahasiswa.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (student: Mahasiswa) => {
    setEditingStudent(student);
    setNama(student.nama || "");
    setNim(student.nim || "");
    setAngkatan(student.angkatan || "");
    setJurusan(student.jurusan || "");
    setFieldErrors({});
    setFeedback(null);

    if (!isDesktop) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
    setTimeout(() => {
      namaRef.current?.focus();
    }, 120);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);

    const target = pendingDelete;
    const targetId = target.id || target.nim;

    try {
      await deleteMahasiswa(targetId, target.nim);
      setMahasiswaList((prev) =>
        prev.filter((m) => m.id !== targetId && m.nim !== target.nim)
      );

      if (
        editingStudent &&
        (editingStudent.id === targetId || editingStudent.nim === target.nim)
      ) {
        resetForm();
      }

      setPendingDelete(null);
      showFeedback("info", `${target.nama} telah dihapus dari daftar.`);
    } finally {
      setDeleting(false);
    }
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

  const cleanStudents = deduplicateMahasiswa(mahasiswaList);
  const isEditing = Boolean(editingStudent);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top Horizontal Shell Header */}
        <AppShellHeader activeTab="home" user={user} />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.pageContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shellContainer}>
            {/* Page Heading & Intro */}
            <View style={styles.pageIntroBlock}>
              <Text style={styles.pageTitle}>Data Mahasiswa</Text>
              <Text style={styles.pageIntro}>
                Kelola catatan mahasiswa terdaftar. Tambah data baru, perbarui detail,
                atau hapus data mahasiswa.
              </Text>
            </View>

            {/* Unobtrusive Status Feedback */}
            {feedback ? (
              <View
                style={[
                  styles.feedbackBanner,
                  feedback.type === "info" && styles.feedbackBannerInfo,
                ]}
                accessibilityLiveRegion="polite"
              >
                <View style={styles.feedbackLeft}>
                  <View
                    style={[
                      styles.feedbackAccent,
                      feedback.type === "info" && styles.feedbackAccentInfo,
                    ]}
                  />
                  <Text style={styles.feedbackText}>{feedback.message}</Text>
                </View>
                <Pressable
                  onPress={() => setFeedback(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.feedbackClose}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup notifikasi"
                >
                  <Text style={styles.feedbackCloseText}>Tutup</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Responsive Two-Column Desktop / Stacked Mobile Layout */}
            <View style={[styles.mainGrid, isDesktop && styles.mainGridDesktop]}>
              {/* Left Column: CRUD Form */}
              <View style={[styles.formColumn, isDesktop && styles.formColumnDesktop]}>
                <View
                  style={[
                    styles.formPanel,
                    isEditing && styles.formPanelEditing,
                  ]}
                >
                  <View style={styles.formHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formSectionTag}>
                        {isEditing ? "MODE EDIT" : "FORM INPUT"}
                      </Text>
                      <Text style={styles.formHeading}>
                        {isEditing ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
                      </Text>
                    </View>
                    {isEditing ? (
                      <View style={styles.editingPill}>
                        <Text style={styles.editingPillText} numberOfLines={1}>
                          {editingStudent?.nim}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Field: Nama */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Nama</Text>
                    <TextInput
                      ref={namaRef}
                      style={[
                        styles.input,
                        focusedField === "nama" && styles.inputFocused,
                        Boolean(fieldErrors.nama) && styles.inputError,
                      ]}
                      placeholder="Contoh: Burhan Pratama"
                      placeholderTextColor={COLORS.inkMuted}
                      value={nama}
                      onChangeText={(val) => {
                        setNama(val);
                        clearSingleFieldError("nama");
                      }}
                      onFocus={() => setFocusedField("nama")}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="next"
                      onSubmitEditing={() => nimRef.current?.focus()}
                      editable={!submitting}
                      accessibilityLabel="Nama"
                    />
                    {fieldErrors.nama ? (
                      <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
                        {fieldErrors.nama}
                      </Text>
                    ) : null}
                  </View>

                  {/* Field: NIM */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>NIM</Text>
                    <TextInput
                      ref={nimRef}
                      style={[
                        styles.input,
                        focusedField === "nim" && styles.inputFocused,
                        Boolean(fieldErrors.nim) && styles.inputError,
                      ]}
                      placeholder="Contoh: 1201223045"
                      placeholderTextColor={COLORS.inkMuted}
                      value={nim}
                      onChangeText={(val) => {
                        setNim(val);
                        clearSingleFieldError("nim");
                      }}
                      onFocus={() => setFocusedField("nim")}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="numeric"
                      returnKeyType="next"
                      onSubmitEditing={() => angkatanRef.current?.focus()}
                      editable={!submitting}
                      accessibilityLabel="NIM"
                    />
                    {fieldErrors.nim ? (
                      <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
                        {fieldErrors.nim}
                      </Text>
                    ) : null}
                  </View>

                  {/* Field: Angkatan */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Angkatan</Text>
                    <TextInput
                      ref={angkatanRef}
                      style={[
                        styles.input,
                        focusedField === "angkatan" && styles.inputFocused,
                        Boolean(fieldErrors.angkatan) && styles.inputError,
                      ]}
                      placeholder="Contoh: 2024"
                      placeholderTextColor={COLORS.inkMuted}
                      value={angkatan}
                      onChangeText={(val) => {
                        setAngkatan(val);
                        clearSingleFieldError("angkatan");
                      }}
                      onFocus={() => setFocusedField("angkatan")}
                      onBlur={() => setFocusedField(null)}
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="next"
                      onSubmitEditing={() => jurusanRef.current?.focus()}
                      editable={!submitting}
                      accessibilityLabel="Angkatan"
                    />
                    {fieldErrors.angkatan ? (
                      <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
                        {fieldErrors.angkatan}
                      </Text>
                    ) : null}
                  </View>

                  {/* Field: Jurusan */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Jurusan</Text>
                    <TextInput
                      ref={jurusanRef}
                      style={[
                        styles.input,
                        focusedField === "jurusan" && styles.inputFocused,
                        Boolean(fieldErrors.jurusan) && styles.inputError,
                      ]}
                      placeholder="Contoh: S1 Rekayasa Perangkat Lunak"
                      placeholderTextColor={COLORS.inkMuted}
                      value={jurusan}
                      onChangeText={(val) => {
                        setJurusan(val);
                        clearSingleFieldError("jurusan");
                      }}
                      onFocus={() => setFocusedField("jurusan")}
                      onBlur={() => setFocusedField(null)}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmitForm}
                      editable={!submitting}
                      accessibilityLabel="Jurusan"
                    />
                    {fieldErrors.jurusan ? (
                      <Text style={styles.fieldErrorText} accessibilityLiveRegion="polite">
                        {fieldErrors.jurusan}
                      </Text>
                    ) : null}
                  </View>

                  {/* Submit & Cancel Actions */}
                  <View style={styles.formActionsRow}>
                    <Pressable
                      onPress={handleSubmitForm}
                      disabled={submitting}
                      style={({ pressed }) => [
                        styles.submitButton,
                        isEditing && styles.submitButtonFlex,
                        pressed && !submitting && styles.submitButtonPressed,
                        submitting && styles.buttonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: submitting, busy: submitting }}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color={COLORS.ink} />
                      ) : (
                        <Text style={styles.submitButtonText}>
                          {isEditing ? "Simpan Perubahan" : "Tambah Mahasiswa"}
                        </Text>
                      )}
                    </Pressable>

                    {isEditing ? (
                      <Pressable
                        onPress={resetForm}
                        disabled={submitting}
                        style={({ pressed }) => [
                          styles.cancelEditButton,
                          pressed && styles.cancelEditButtonPressed,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.cancelEditButtonText}>Batal</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Right Column: Student List Section */}
              <View style={styles.listColumn}>
                <View style={styles.listSectionHeader}>
                  <Text style={styles.listSectionTitle}>Daftar Mahasiswa</Text>
                  <View style={styles.countBox}>
                    <Text style={styles.countNumber}>{cleanStudents.length}</Text>
                    <Text style={styles.countLabel}>mahasiswa</Text>
                  </View>
                </View>

                {cleanStudents.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Belum ada data mahasiswa</Text>
                    <Text style={styles.emptySubtitle}>
                      Tambahkan data mahasiswa pertama melalui form{" "}
                      {isDesktop ? "di sebelah kiri" : "di atas"} untuk menampilkannya di
                      daftar ini.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardsStack}>
                    {cleanStudents.map((item) => {
                      const isBeingEdited =
                        editingStudent &&
                        (editingStudent.id === item.id ||
                          editingStudent.nim === item.nim);

                      return (
                        <View
                          key={item.nim || item.id || item.nama}
                          style={[
                            styles.studentCard,
                            isBeingEdited && styles.studentCardActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.cardContentLayout,
                              !isCompactMobile && styles.cardContentLayoutRow,
                            ]}
                          >
                            {/* Student Info */}
                            <View style={styles.cardMainInfo}>
                              <View style={styles.cardTitleRow}>
                                <Text style={styles.studentName}>{item.nama}</Text>
                                {isBeingEdited ? (
                                  <Text style={styles.editingTag}>Sedang diedit</Text>
                                ) : null}
                              </View>

                              <View style={styles.metaGrid}>
                                <View style={styles.metaCell}>
                                  <Text style={styles.metaLabel}>NIM</Text>
                                  <Text style={styles.metaValue}>{item.nim}</Text>
                                </View>

                                <View style={styles.metaCell}>
                                  <Text style={styles.metaLabel}>ANGKATAN</Text>
                                  <Text style={styles.metaValue}>{item.angkatan}</Text>
                                </View>

                                <View style={styles.metaCellWide}>
                                  <Text style={styles.metaLabel}>JURUSAN</Text>
                                  <Text style={styles.metaValue}>{item.jurusan}</Text>
                                </View>
                              </View>
                            </View>

                            {/* Card Actions */}
                            <View
                              style={[
                                styles.cardActions,
                                isCompactMobile
                                  ? styles.cardActionsMobile
                                  : styles.cardActionsDesktop,
                              ]}
                            >
                              <Pressable
                                onPress={() => handleStartEdit(item)}
                                style={({ pressed }) => [
                                  styles.editButton,
                                  isBeingEdited && styles.editButtonActive,
                                  pressed && styles.editButtonPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit ${item.nama}`}
                              >
                                <View style={styles.editAccentBar} />
                                <Text style={styles.editButtonText}>Edit</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => setPendingDelete(item)}
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
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Simple Delete Confirmation Dialog */}
      <Modal
        visible={Boolean(pendingDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Hapus Mahasiswa</Text>
            <Text style={styles.modalBody}>
              Hapus data{" "}
              <Text style={styles.modalStudentName}>{pendingDelete?.nama}</Text> (NIM{" "}
              {pendingDelete?.nim}) dari daftar mahasiswa?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPendingDelete(null)}
                disabled={deleting}
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.modalCancelPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirmDelete}
                disabled={deleting}
                style={({ pressed }) => [
                  styles.modalConfirmDeleteButton,
                  pressed && styles.modalConfirmDeletePressed,
                  deleting && styles.buttonDisabled,
                ]}
                accessibilityRole="button"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.coralInk} />
                ) : (
                  <Text style={styles.modalConfirmDeleteText}>Hapus</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.inkMuted,
  },

  // Main Content Shell
  pageContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  shellContainer: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  pageIntroBlock: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(34, 42, 42, 0.18)",
  },
  pageTitle: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 24,
    lineHeight: 30,
    color: COLORS.ink,
    marginBottom: 4,
  },
  pageIntro: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMuted,
  },

  // Feedback Banner
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primarySurface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: SPACING.lg,
    gap: 12,
    ...retroOffset("sm"),
  },
  feedbackBannerInfo: {
    backgroundColor: COLORS.orangeSurface,
  },
  feedbackLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  feedbackAccent: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.ink,
  },
  feedbackAccentInfo: {
    backgroundColor: COLORS.orange,
  },
  feedbackText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.ink,
    flex: 1,
  },
  feedbackClose: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 8,
    ...(WEB_POINTER || {}),
  },
  feedbackCloseText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 12,
    color: COLORS.inkMuted,
    textDecorationLine: "underline",
  },

  // Two-column Grid
  mainGrid: {
    flexDirection: "column",
    gap: SPACING.lg,
  },
  mainGridDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.lg,
  },
  formColumn: {
    width: "100%",
  },
  formColumnDesktop: {
    width: 360,
    flexShrink: 0,
  },
  listColumn: {
    flex: 1,
    minWidth: 0,
  },

  // Form Panel
  formPanel: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...retroOffset("md"),
  },
  formPanelEditing: {
    borderColor: COLORS.primary,
  },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: SPACING.md,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(34, 42, 42, 0.16)",
  },
  formSectionTag: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 11,
    letterSpacing: 0.7,
    color: COLORS.rust,
    marginBottom: 4,
  },
  formHeading: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.ink,
  },
  editingPill: {
    backgroundColor: COLORS.orangeSurface,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 120,
  },
  editingPillText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 11,
    color: COLORS.ink,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.ink,
    marginBottom: 5,
  },
  input: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  inputError: {
    borderColor: COLORS.coral,
  },
  fieldErrorText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.coralInk,
    marginTop: 5,
  },
  formActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  submitButton: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  submitButtonFlex: {
    flex: 1,
    width: undefined,
  },
  submitButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.ink,
  },
  cancelEditButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  cancelEditButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  cancelEditButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.ink,
  },

  // List Section Header
  listSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: 12,
  },
  listSectionTitle: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 18,
    color: COLORS.ink,
  },
  countBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countNumber: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    color: COLORS.rust,
  },
  countLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 12,
    color: COLORS.inkMuted,
  },

  // Empty State
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: "flex-start",
  },
  emptyTitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 16,
    color: COLORS.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMuted,
  },

  // Cards Stack & Card Layout
  cardsStack: {
    gap: 14,
  },
  studentCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...retroOffset("md"),
  },
  studentCardActive: {
    borderColor: COLORS.primary,
  },
  cardContentLayout: {
    gap: 14,
  },
  cardContentLayoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  cardMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  studentName: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.ink,
  },
  editingTag: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 11,
    color: COLORS.primaryInk,
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  metaCell: {
    minWidth: 96,
  },
  metaCellWide: {
    flex: 1,
    minWidth: 160,
  },
  metaLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: COLORS.rust,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
  },

  // Card Actions
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  cardActionsDesktop: {
    flexShrink: 0,
    alignItems: "center",
  },
  cardActionsMobile: {
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: "rgba(34, 42, 42, 0.14)",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    minWidth: 74,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    gap: 6,
    ...(WEB_POINTER || {}),
  },
  editButtonActive: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  editButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  editAccentBar: {
    width: 6,
    height: 14,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
  },
  editButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.ink,
  },
  deleteButton: {
    minHeight: 44,
    minWidth: 74,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.coral,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  deleteButtonPressed: {
    backgroundColor: COLORS.coralSurface,
  },
  deleteButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.coralInk,
  },

  // Confirmation Dialog
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.scrim,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...retroOffset("md"),
  },
  modalTitle: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 16,
    color: COLORS.ink,
    marginBottom: 8,
  },
  modalBody: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inkMuted,
    marginBottom: SPACING.lg,
  },
  modalStudentName: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.ink,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelButton: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  modalCancelPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  modalCancelText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.ink,
  },
  modalConfirmDeleteButton: {
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.coralSurface,
    borderWidth: 2,
    borderColor: COLORS.coral,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  modalConfirmDeletePressed: {
    opacity: 0.9,
  },
  modalConfirmDeleteText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.coralInk,
  },
});
