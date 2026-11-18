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
        setSummary(`🎉 SEMUA PENGUJIAN BERHASIL (${passCount}/${totalCount} PASS)!`);
      } else {
        setSummary(`⚠️ PENGUJIAN SELESAI: ${passCount}/${totalCount} PASS.`);
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
        return <View style={[styles.badge, styles.passBadge]}><Text style={styles.badgeTextPass}>PASS</Text></View>;
      case "FAIL":
        return <View style={[styles.badge, styles.failBadge]}><Text style={styles.badgeTextFail}>FAIL</Text></View>;
      case "RUNNING":
        return (
          <View style={[styles.badge, styles.runningBadge]}>
            <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 4 }} />
            <Text style={styles.badgeTextRunning}>RUNNING</Text>
          </View>
        );
      default:
        return <View style={[styles.badge, styles.pendingBadge]}><Text style={styles.badgeTextPending}>PENDING</Text></View>;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Skenario Pengujian User Role</Text>
        <Text style={styles.subtitle}>
          Verifikasi Autentikasi Google vs Email/Password & Role Super Admin
        </Text>

        <View style={styles.metaBox}>
          <Text style={styles.metaText}>
            <Text style={{ fontWeight: "bold" }}>Email Target:</Text> {TEST_EMAIL}
          </Text>
          <Text style={styles.metaText}>
            <Text style={{ fontWeight: "bold" }}>Password Uji:</Text> {TEST_PASSWORD}
          </Text>
          <Text style={styles.metaText}>
            <Text style={{ fontWeight: "bold" }}>Ekspektasi:</Text> Kedua metode login masuk ke akun dengan UID yang sama dan memperoleh role{" "}
            <Text style={{ color: "#d97706", fontWeight: "bold" }}>Super Admin</Text>.
          </Text>
        </View>

        <Pressable
          style={[styles.runButton, isRunning && styles.disabledButton]}
          onPress={handleStartTesting}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.runButtonText}>▶ Jalankan Semua Skenario Pengujian</Text>
          )}
        </Pressable>

        {summary ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}
      </View>

      {/* List Test Cases */}
      {testResults.length > 0 && (
        <View style={styles.testList}>
          {testResults.map((tc) => (
            <View key={tc.id} style={styles.testCard}>
              <View style={styles.testCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testId}>{tc.id}</Text>
                  <Text style={styles.testTitle}>{tc.title}</Text>
                </View>
                {getStatusBadge(tc.status)}
              </View>

              <Text style={styles.testDesc}>{tc.description}</Text>

              <View style={styles.resultBlock}>
                <Text style={styles.label}>Ekspektasi:</Text>
                <Text style={styles.valExpected}>{tc.expected}</Text>
              </View>

              <View style={styles.resultBlock}>
                <Text style={styles.label}>Hasil Aktual:</Text>
                <Text
                  style={[
                    styles.valActual,
                    tc.status === "PASS" ? styles.textPass : tc.status === "FAIL" ? styles.textFail : null,
                  ]}
                >
                  {tc.actual}
                </Text>
              </View>

              {tc.details && tc.details.length > 0 && (
                <View style={styles.detailsBlock}>
                  <Text style={styles.detailsTitle}>Detail Verifikasi:</Text>
                  {tc.details.map((item, idx) => (
                    <Text key={idx} style={styles.detailItem}>• {item}</Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.navButtons}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.replace("/home" as any)}
        >
          <Text style={styles.backButtonText}>Ke Halaman Home (Portal)</Text>
        </Pressable>
        <Pressable
          style={styles.backLoginButton}
          onPress={() => router.replace("/" as any)}
        >
          <Text style={styles.backLoginButtonText}>Ke Halaman Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  content: {
    padding: 16,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 14,
  },
  metaBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
    marginBottom: 16,
  },
  metaText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  runButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  runButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  summaryBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#065f46",
    textAlign: "center",
  },
  testList: {
    gap: 12,
    marginBottom: 20,
  },
  testCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  testCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  testId: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
  },
  testTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 2,
  },
  testDesc: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 10,
  },
  resultBlock: {
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  valExpected: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
  },
  valActual: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
    fontWeight: "500",
  },
  textPass: {
    color: "#16a34a",
  },
  textFail: {
    color: "#dc2626",
  },
  detailsBlock: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 4,
  },
  detailItem: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passBadge: {
    backgroundColor: "#dcfce7",
  },
  badgeTextPass: {
    color: "#15803d",
    fontSize: 11,
    fontWeight: "bold",
  },
  failBadge: {
    backgroundColor: "#fee2e2",
  },
  badgeTextFail: {
    color: "#b91c1c",
    fontSize: 11,
    fontWeight: "bold",
  },
  runningBadge: {
    backgroundColor: "#dbeafe",
  },
  badgeTextRunning: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "bold",
  },
  pendingBadge: {
    backgroundColor: "#f1f5f9",
  },
  badgeTextPending: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "bold",
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  backLoginButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  backLoginButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "bold",
  },
});
