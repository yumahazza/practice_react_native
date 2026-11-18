import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppShellHeader, executeLogout } from "../components/AppShellHeader";
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
import { getRolePermissions } from "../services/userService";
import { UserProfile } from "../types";

function getInitials(name?: string | null): string {
  const clean = (name || "YM").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function maskToken(token: string | null): string {
  if (!token) return "-";
  if (token.length <= 20) return `${token.slice(0, 6)}••••••`;
  return `${token.slice(0, 12)}••••••${token.slice(-6)}`;
}

function formatProviderName(providerId?: string): string {
  if (providerId === "google.com") return "Sign in with Google";
  if (providerId === "password") return "Sign in Manual";
  return providerId || "Sesi Lokal";
}

function formatLinkedProviders(providers?: string[]): string {
  if (!providers || providers.length === 0) return "Sesi Lokal";
  return providers
    .map((p) => (p === "google.com" ? "Google" : p === "password" ? "Manual" : p))
    .join(", ");
}

export default function ProfilePage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 880;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
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
        setToken(session.token);
        setSessionReady(true);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (!sessionReady) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat informasi akun...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const permissions = getRolePermissions(user?.role);
  const isSuperAdmin = permissions.isSuperAdmin;
  const displayName = user?.displayName || "yumahazza";

  const permissionRows = [
    {
      label: "Lihat & Tambah Data Mahasiswa",
      allowed: permissions.canCreateMahasiswa,
    },
    {
      label: "Edit Data Mahasiswa",
      allowed: permissions.canCreateMahasiswa,
    },
    {
      label: "Hapus Data Mahasiswa",
      allowed: permissions.canDeleteMahasiswa,
    },
    {
      label: "Verifikasi & Kelola Role Akun",
      allowed: permissions.canManageRoles,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="light" />
      <AppShellHeader activeTab="profile" user={user} />

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shellContainer}>
          {/* Page Title */}
          <View style={styles.pageIntroBlock}>
            <Text style={styles.pageTitle}>Profil Akun</Text>
            <Text style={styles.pageIntro}>
              Rincian identitas akun, metode autentikasi aktif, serta status role akses.
            </Text>
          </View>

          <View style={[styles.mainGrid, isDesktop && styles.mainGridDesktop]}>
            {/* Left Column: Account Summary & Role Badge */}
            <View style={[styles.summaryCol, isDesktop && styles.summaryColDesktop]}>
              <View style={styles.card}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                  </View>
                  <View style={styles.identityMeta}>
                    <Text style={styles.usernameTitle}>{displayName}</Text>
                    <Text style={styles.emailSubtitle} numberOfLines={2}>
                      {user?.email || "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.roleSection}>
                  <Text style={styles.sectionMicroTag}>STATUS ROLE</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      isSuperAdmin ? styles.roleBadgeSuperAdmin : styles.roleBadgeStandard,
                    ]}
                  >
                    <Text style={styles.roleBadgeText}>
                      {user?.role || "Mahasiswa"}
                    </Text>
                  </View>
                  <Text style={styles.roleDesc}>
                    {isSuperAdmin
                      ? "Akun ini memiliki hak akses penuh Super Admin untuk mengelola seluruh data mahasiswa dan konfigurasi role."
                      : "Akun memiliki akses standar untuk mengelola data mahasiswa pada portal."}
                  </Text>
                </View>

                <View style={styles.summaryActions}>
                  <Pressable
                    onPress={() => router.replace("/home" as any)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.primaryButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.primaryButtonText}>Kelola Data Mahasiswa</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => executeLogout(() => router.replace("/" as any))}
                    style={({ pressed }) => [
                      styles.logoutCardButton,
                      pressed && styles.logoutCardButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.logoutCardButtonText}>Logout</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Right Column: Detailed Account Info & Permissions */}
            <View style={styles.detailCol}>
              {/* Account Information Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sectionMicroTag}>IDENTITAS TERPERINCI</Text>
                  <Text style={styles.cardTitle}>Informasi Akun</Text>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>USERNAME</Text>
                    <Text style={styles.infoValue}>{displayName}</Text>
                  </View>

                  <View style={styles.infoCell}>
                    <Text style={styles.infoLabel}>STATUS ROLE</Text>
                    <Text style={styles.infoValue}>{user?.role || "Mahasiswa"}</Text>
                  </View>

                  <View style={styles.infoCellWide}>
                    <Text style={styles.infoLabel}>EMAIL</Text>
                    <Text style={styles.infoValue}>{user?.email || "-"}</Text>
                  </View>
                </View>
              </View>

              {/* Permissions Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sectionMicroTag}>OTORISASI</Text>
                  <Text style={styles.cardTitle}>Hak Akses Role</Text>
                </View>

                <View style={styles.permList}>
                  {permissionRows.map((perm, idx) => (
                    <View
                      key={perm.label}
                      style={[
                        styles.permRow,
                        idx === permissionRows.length - 1 && styles.permRowLast,
                      ]}
                    >
                      <Text style={styles.permLabel}>{perm.label}</Text>
                      <View
                        style={[
                          styles.permStatusBox,
                          perm.allowed
                            ? styles.permStatusAllowed
                            : styles.permStatusRestricted,
                        ]}
                      >
                        <Text
                          style={[
                            styles.permStatusText,
                            perm.allowed
                              ? styles.permStatusTextAllowed
                              : styles.permStatusTextRestricted,
                          ]}
                        >
                          {perm.allowed ? "Diizinkan" : "Terbatas"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {isSuperAdmin ? (
                  <Pressable
                    onPress={() => router.push("/test-role" as any)}
                    style={({ pressed }) => [
                      styles.verifyRoleButton,
                      pressed && styles.verifyRoleButtonPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.verifyRoleButtonText}>
                      Uji Konsistensi Role Akun
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.purple,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  bodyScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    borderBottomColor: COLORS.hairline,
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
    color: COLORS.purple,
  },
  mainGrid: {
    flexDirection: "column",
    gap: SPACING.lg,
  },
  mainGridDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.lg,
  },
  summaryCol: {
    width: "100%",
  },
  summaryColDesktop: {
    width: 360,
    flexShrink: 0,
  },
  detailCol: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...retroOffset("md"),
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.hairline,
    marginBottom: SPACING.md,
  },
  avatarBox: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.purple,
    borderWidth: 2,
    borderColor: COLORS.ink,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
  },
  avatarText: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 20,
    color: COLORS.mustard,
  },
  identityMeta: {
    flex: 1,
    minWidth: 0,
  },
  usernameTitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 19,
    color: COLORS.ink,
  },
  emailSubtitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    color: COLORS.purple,
    marginTop: 2,
  },
  roleSection: {
    marginBottom: SPACING.lg,
  },
  sectionMicroTag: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 11,
    letterSpacing: 0.7,
    color: COLORS.primary,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
    ...retroOffset("sm"),
  },
  roleBadgeSuperAdmin: {
    backgroundColor: COLORS.mustard,
  },
  roleBadgeStandard: {
    backgroundColor: COLORS.inputSurface,
  },
  roleBadgeText: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    color: COLORS.ink,
  },
  roleDesc: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkMuted,
  },
  summaryActions: {
    gap: 10,
  },
  primaryButton: {
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
  primaryButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.onPrimary,
  },
  logoutCardButton: {
    backgroundColor: COLORS.inputSurface,
    borderWidth: 2,
    borderColor: COLORS.red,
    borderRadius: RADIUS.sm,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    ...(WEB_POINTER || {}),
  },
  logoutCardButtonPressed: {
    backgroundColor: COLORS.redSurface,
  },
  logoutCardButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.redInk,
  },
  cardHeader: {
    marginBottom: SPACING.md,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.hairline,
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 17,
    color: COLORS.ink,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  infoCell: {
    minWidth: 180,
    flex: 1,
  },
  infoCellWide: {
    width: "100%",
  },
  infoLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: COLORS.primary,
    marginBottom: 3,
  },
  infoValue: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.purple,
  },
  infoValueMono: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 13,
    color: COLORS.purple,
  },
  tokenRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  activeTokenBadge: {
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeTokenText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 11,
    color: COLORS.primary,
  },
  permList: {
    gap: 2,
  },
  permRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    gap: 12,
  },
  permRowLast: {
    borderBottomWidth: 0,
  },
  permLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 14,
    color: COLORS.ink,
    flex: 1,
  },
  permStatusBox: {
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  permStatusAllowed: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primary,
  },
  permStatusRestricted: {
    backgroundColor: COLORS.inputSurface,
  },
  permStatusText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 12,
  },
  permStatusTextAllowed: {
    color: COLORS.primary,
  },
  permStatusTextRestricted: {
    color: COLORS.inkMuted,
  },
  verifyRoleButton: {
    marginTop: SPACING.md,
    minHeight: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputSurface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  verifyRoleButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  verifyRoleButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.ink,
  },
});
