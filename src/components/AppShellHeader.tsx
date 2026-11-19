import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { auth } from "../config/firebaseConfig";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
  retroOffset,
} from "../constants/theme";
import { clearAuthSession, clearAuthSessionSyncWeb } from "../services/authStorage";
import { UserProfile } from "../types";

export function executeLogout(onNativeNavigate: () => void) {
  try {
    clearAuthSessionSyncWeb();
  } catch {}

  clearAuthSession().catch(() => {});

  try {
    signOut(auth).catch(() => {});
  } catch {}

  if (Platform.OS === "web") {
    window.location.href = "/";
  } else {
    onNativeNavigate();
  }
}

interface AppShellHeaderProps {
  activeTab: "home" | "profile";
  user: UserProfile | null;
}

export function AppShellHeader({ activeTab, user }: AppShellHeaderProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const isSuperAdmin = user?.role === "Super Admin";
  const displayName = user?.displayName || "yumahazza";

  const handleNavigate = (target: "home" | "profile") => {
    if (target === activeTab) return;
    router.replace((target === "home" ? "/home" : "/profile") as any);
  };

  const handleLogout = () => {
    executeLogout(() => router.replace("/" as any));
  };

  const navMenu = (
    <View style={[styles.navGroup, isCompact && styles.navGroupCompact]}>
      <Pressable
        onPress={() => handleNavigate("home")}
        style={({ pressed }) => [
          styles.navItem,
          isCompact && styles.navItemCompact,
          activeTab === "home" ? styles.navItemActive : styles.navItemIdle,
          pressed && activeTab !== "home" && styles.navItemPressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "home" }}
      >
        <Text
          style={[
            styles.navItemText,
            activeTab === "home" && styles.navItemTextActive,
          ]}
        >
          Data Mahasiswa
        </Text>
      </Pressable>

      <Pressable
        onPress={() => handleNavigate("profile")}
        style={({ pressed }) => [
          styles.navItem,
          isCompact && styles.navItemCompact,
          activeTab === "profile" ? styles.navItemActive : styles.navItemIdle,
          pressed && activeTab !== "profile" && styles.navItemPressed,
        ]}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "profile" }}
      >
        <Text
          style={[
            styles.navItemText,
            activeTab === "profile" && styles.navItemTextActive,
          ]}
        >
          Profile
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.topHeaderBar}>
      <View style={styles.topHeaderInner}>
        <View style={styles.topRow}>
          <View style={styles.leftCluster}>
            <Pressable
              onPress={() => handleNavigate("home")}
              style={styles.logoGroup}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke Data Mahasiswa"
            >
              <View style={styles.logoMark}>
                <View style={styles.logoMarkInner} />
              </View>
              <Text style={styles.logoText}>PORTAL MAHASISWA</Text>
            </Pressable>

            {!isCompact ? navMenu : null}
          </View>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => handleNavigate("profile")}
              style={({ pressed }) => [
                styles.identityChip,
                pressed && styles.identityChipPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Buka menu Profile"
            >
              <Text style={styles.greetingText} numberOfLines={1}>
                Halo, {displayName}
              </Text>
              {isSuperAdmin ? (
                <View style={styles.superAdminTag}>
                  <Text style={styles.superAdminTagText}>SUPER ADMIN</Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Logout dari akun"
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        {isCompact ? <View style={styles.compactNavRow}>{navMenu}</View> : null}
      </View>
      <View style={styles.headerAccentRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  topHeaderBar: {
    backgroundColor: COLORS.purple,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.ink,
  },
  topHeaderInner: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 10,
  },
  headerAccentRule: {
    height: 3,
    backgroundColor: COLORS.mustard,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  leftCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  logoMark: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.ink,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  logoMarkInner: {
    width: 6,
    height: 6,
    borderRadius: 2,
    backgroundColor: COLORS.onPurple,
  },
  logoText: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    letterSpacing: 0.5,
    color: COLORS.onPurple,
  },
  navGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navGroupCompact: {
    width: "100%",
  },
  navItem: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  navItemCompact: {
    flex: 1,
    minHeight: 42,
  },
  navItemActive: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.mustard,
    ...retroOffset("sm", COLORS.ink),
  },
  navItemIdle: {
    backgroundColor: "transparent",
    borderColor: COLORS.headerBorderSubtle,
  },
  navItemPressed: {
    backgroundColor: COLORS.purplePressed,
  },
  navItemText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.onPurple,
  },
  navItemTextActive: {
    color: COLORS.onPrimary,
  },
  compactNavRow: {
    width: "100%",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  identityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    ...(WEB_POINTER || {}),
  },
  identityChipPressed: {
    backgroundColor: COLORS.purplePressed,
  },
  greetingText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 14,
    color: COLORS.onPurple,
    maxWidth: 160,
  },
  superAdminTag: {
    backgroundColor: COLORS.mustard,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  superAdminTagText: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 10,
    color: COLORS.ink,
  },
  logoutButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: RADIUS.sm,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: COLORS.headerBorderSubtle,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  logoutButtonPressed: {
    backgroundColor: COLORS.purplePressed,
    borderColor: COLORS.orange,
  },
  logoutButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 13,
    color: COLORS.onPurple,
  },
});
