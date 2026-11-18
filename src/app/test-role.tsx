import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  COLORS,
  FONTS,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  WEB_POINTER,
  retroOffset,
} from "../constants/theme";
import {
  runRoleTestSuite,
  TestCaseResult,
  TEST_EMAIL,
  TEST_PASSWORD,
} from "../services/roleTestingService";

export default function TestRoleScreen() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const handleStartTesting = async () => {
    setIsRunning(true);
    setSummary(null);

    try {
      const results = await runRoleTestSuite((liveResults) => {
        setTestResults(liveResults);
      });

      const passCount = results.filter((r) => r.status === "PASS").length;
      const totalCount = results.length;

      if (passCount === totalCount) {
        setSummary(`Semua pengujian berhasil (${passCount}/${totalCount} PASS).`);
      } else {
        setSummary(`Pengujian selesai: ${passCount}/${totalCount} PASS.`);
      }
    } catch (err: any) {
      setSummary(`Terjadi kesalahan saat pengujian: ${err?.message || err}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: TestCaseResult["status"]) => {
    switch (status) {
      case "PASS":
        return (
          <View style={[styles.badge, styles.passBadge]}>
            <Text style={styles.badgeTextPass}>PASS</Text>
          </View>
        );
      case "FAIL":
        return (
          <View style={[styles.badge, styles.failBadge]}>
            <Text style={styles.badgeTextFail}>FAIL</Text>
          </View>
        );
      case "RUNNING":
        return (
          <View style={[styles.badge, styles.runningBadge]}>
            <ActivityIndicator
              size="small"
              color={COLORS.ink}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.badgeTextRunning}>RUNNING</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, styles.pendingBadge]}>
            <Text style={styles.badgeTextPending}>PENDING</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Verifikasi Role Akun</Text>
          <Text style={styles.subtitle}>
            Memeriksa konsistensi UID dan role Super Admin antara Google Sign-In dan
            Email/Password.
          </Text>

          <View style={styles.metaBox}>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Email Target: </Text>
              {TEST_EMAIL}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Password Uji: </Text>
              {TEST_PASSWORD}
            </Text>
            <Text style={styles.metaText}>
              <Text style={styles.metaLabel}>Ekspektasi: </Text>
              Kedua metode login menghasilkan UID identik dengan role{" "}
              <Text style={styles.roleHighlight}>Super Admin</Text>.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.runButton,
              pressed && !isRunning && styles.runButtonPressed,
              isRunning && styles.disabledButton,
            ]}
            onPress={handleStartTesting}
            disabled={isRunning}
            accessibilityRole="button"
            accessibilityState={{ disabled: isRunning, busy: isRunning }}
          >
            {isRunning ? (
              <ActivityIndicator color={COLORS.ink} size="small" />
            ) : (
              <Text style={styles.runButtonText}>Jalankan Pengujian</Text>
            )}
          </Pressable>

          {summary ? (
            <View style={styles.summaryBox} accessibilityLiveRegion="polite">
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          ) : null}
        </View>

        {testResults.length > 0 && (
          <View style={styles.testList}>
            {testResults.map((tc) => (
              <View key={tc.id} style={styles.testCard}>
                <View style={styles.testCardHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.testId}>{tc.id}</Text>
                    <Text style={styles.testTitle}>{tc.title}</Text>
                  </View>
                  {getStatusBadge(tc.status)}
                </View>

                <Text style={styles.testDesc}>{tc.description}</Text>

                <View style={styles.resultBlock}>
                  <Text style={styles.label}>Ekspektasi</Text>
                  <Text style={styles.valExpected}>{tc.expected}</Text>
                </View>

                <View style={styles.resultBlock}>
                  <Text style={styles.label}>Hasil Aktual</Text>
                  <Text
                    style={[
                      styles.valActual,
                      tc.status === "PASS"
                        ? styles.textPass
                        : tc.status === "FAIL"
                        ? styles.textFail
                        : null,
                    ]}
                  >
                    {tc.actual}
                  </Text>
                </View>

                {tc.details && tc.details.length > 0 && (
                  <View style={styles.detailsBlock}>
                    {tc.details.map((item, idx) => (
                      <Text key={idx} style={styles.detailItem}>
                        - {item}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.navButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => router.replace("/home" as any)}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>Kembali ke Beranda</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.backLoginButton,
              pressed && styles.backLoginButtonPressed,
            ]}
            onPress={() => router.replace("/" as any)}
            accessibilityRole="button"
          >
            <Text style={styles.backLoginButtonText}>Ke Halaman Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  headerBlock: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.inkMuted,
    marginBottom: SPACING.md,
  },
  metaBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.ink,
    gap: 6,
    marginBottom: SPACING.md,
    ...retroOffset("md"),
  },
  metaText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    color: COLORS.ink,
    lineHeight: 19,
  },
  metaLabel: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.ink,
  },
  roleHighlight: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.rust,
  },
  runButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.ink,
    minHeight: 48,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  runButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  disabledButton: {
    opacity: 0.65,
  },
  runButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.ink,
    fontSize: 15,
  },
  summaryBox: {
    marginTop: SPACING.md,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 2,
    borderColor: COLORS.ink,
  },
  summaryText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 13,
    color: COLORS.ink,
    textAlign: "center",
  },
  testList: {
    gap: 12,
    marginBottom: SPACING.lg,
  },
  testCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...retroOffset("md"),
  },
  testCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  testId: {
    fontFamily: FONTS.display,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 11,
    color: COLORS.rust,
  },
  testTitle: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 15,
    color: COLORS.ink,
    marginTop: 2,
  },
  testDesc: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.inkMuted,
    marginBottom: 8,
  },
  resultBlock: {
    marginTop: 6,
  },
  label: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: 11,
    color: COLORS.rust,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  valExpected: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.ink,
    marginTop: 2,
  },
  valActual: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.ink,
    marginTop: 2,
  },
  textPass: {
    color: COLORS.primaryInk,
  },
  textFail: {
    color: COLORS.coralInk,
  },
  detailsBlock: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    marginTop: 8,
    gap: 2,
  },
  detailItem: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.regular,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 18,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
  },
  passBadge: {
    backgroundColor: COLORS.primarySurface,
  },
  badgeTextPass: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primaryInk,
    fontSize: 11,
  },
  failBadge: {
    backgroundColor: COLORS.coralSurface,
  },
  badgeTextFail: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.coralInk,
    fontSize: 11,
  },
  runningBadge: {
    backgroundColor: COLORS.orangeSurface,
  },
  badgeTextRunning: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.ink,
    fontSize: 11,
  },
  pendingBadge: {
    backgroundColor: COLORS.background,
  },
  badgeTextPending: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.semiBold,
    color: COLORS.inkMuted,
    fontSize: 11,
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: SPACING.xl,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.ink,
    minHeight: 46,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...(WEB_POINTER || {}),
  },
  backButtonPressed: {
    opacity: 0.88,
  },
  backButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.surface,
    fontSize: 13,
  },
  backLoginButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.ink,
    minHeight: 46,
    borderRadius: RADIUS.sm,
    justifyContent: "center",
    alignItems: "center",
    ...retroOffset("sm"),
    ...(WEB_POINTER || {}),
  },
  backLoginButtonPressed: {
    backgroundColor: COLORS.surfacePressed,
  },
  backLoginButtonText: {
    fontFamily: FONTS.body,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.ink,
    fontSize: 13,
  },
});
