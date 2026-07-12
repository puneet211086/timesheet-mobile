import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as LocalAuthentication from "expo-local-authentication";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { requestNotificationPermission, sendTestNotification } from "../../services/notificationService";

const REMINDER_OPTIONS = [4, 6, 8, 10, 12];

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void;
};

function SettingsRow({ icon, title, description, onPress }: SettingsRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}>
      <View style={styles.iconBox}><Ionicons name={icon} size={21} color="#2563EB" /></View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState(8);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const loadSettings = useCallback(async () => {
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key IN ('shift_reminder_enabled', 'shift_reminder_hours', 'app_lock_enabled')`,
    );
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    setEnabled(values.shift_reminder_enabled === "true");
    setHours(Number(values.shift_reminder_hours ?? "8"));
    setAppLockEnabled(values.app_lock_enabled === "true");
    setLoading(false);
  }, [db]);

  useFocusEffect(useCallback(() => { loadSettings().catch(console.error); }, [loadSettings]));

  const saveSetting = async (key: string, value: string) => {
    await db.runAsync(
      `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value,
    );
  };

  const toggleReminder = async (nextValue: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Mobile feature", "Local shift reminders are available on iOS and Android.");
      return;
    }
    if (nextValue) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert("Notifications disabled", "Enable notifications for this app in your device settings to use shift reminders.");
        return;
      }
    }
    setEnabled(nextValue);
    await saveSetting("shift_reminder_enabled", String(nextValue));
  };

  const chooseHours = async (value: number) => {
    setHours(value);
    await saveSetting("shift_reminder_hours", String(value));
  };

  const toggleAppLock = async (nextValue: boolean) => {
    if (Platform.OS === "web") {
      Alert.alert("Mobile feature", "Face ID and device authentication are available on iOS and Android.");
      return;
    }

    if (nextValue) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "Device authentication unavailable",
          "Set up Face ID, Touch ID, or device authentication in your phone settings first.",
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable app lock",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (!result.success) return;
    }

    setAppLockEnabled(nextValue);
    await saveSetting("app_lock_enabled", String(nextValue));
  };

  const testReminder = async () => {
    setTesting(true);
    try {
      const sent = await sendTestNotification();
      if (!sent) {
        Alert.alert(
          "Notification unavailable",
          Platform.OS === "web" ? "Test notifications are available on iOS and Android." : "Notification permission has not been granted.",
        );
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>PREFERENCES</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Configure reminders and manage important app information.</Text>

        {Platform.OS === "web" && (
          <View style={styles.webNotice}>
            <Ionicons name="phone-portrait-outline" size={21} color="#92400E" />
            <Text style={styles.webNoticeText}>Notification settings are available when testing the app on an iOS or Android device.</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>PRIVACY & SECURITY</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}><Ionicons name="lock-closed-outline" size={21} color="#2563EB" /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Require Face ID or device authentication</Text>
              <Text style={styles.settingDescription}>Lock the app when it returns from the background.</Text>
            </View>
            <Switch value={appLockEnabled} onValueChange={(value) => void toggleAppLock(value)} disabled={Platform.OS === "web"} />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="finger-print-outline" size={20} color="#475569" />
          <Text style={styles.infoText}>Authentication is handled by iOS or Android. The app never receives or stores your biometric data.</Text>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>REMINDERS</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.iconBox}><Ionicons name="notifications-outline" size={21} color="#2563EB" /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Forgotten clock-out reminder</Text>
              <Text style={styles.settingDescription}>Notify me when an active shift reaches the selected duration.</Text>
            </View>
            <Switch value={enabled} onValueChange={(value) => void toggleReminder(value)} disabled={Platform.OS === "web"} />
          </View>
          <View style={styles.divider} />
          <Text style={styles.label}>Remind me after</Text>
          <View style={styles.optionRow}>
            {REMINDER_OPTIONS.map((option) => {
              const selected = option === hours;
              return (
                <Pressable key={option} disabled={!enabled} onPress={() => void chooseHours(option)} style={[styles.option, selected && styles.optionSelected, !enabled && styles.optionDisabled]}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}h</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable disabled={testing || Platform.OS === "web"} onPress={() => void testReminder()} style={({ pressed }) => [styles.testButton, pressed && styles.pressed, (testing || Platform.OS === "web") && styles.testButtonDisabled]}>
            {testing ? <ActivityIndicator size="small" color="#2563EB" /> : <Ionicons name="notifications-circle-outline" size={22} color="#2563EB" />}
            <Text style={styles.testButtonText}>Send test notification</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#475569" />
          <Text style={styles.infoText}>Reminders are scheduled locally on your phone. No account or cloud service is required.</Text>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionSpacing]}>HELP & LEGAL</Text>
        <View style={styles.card}>
          <SettingsRow icon="shield-checkmark-outline" title="Privacy Policy" description="Learn how your timesheet data is stored and used." onPress={() => router.push("/legal/privacy")} />
          <View style={styles.dividerCompact} />
          <SettingsRow icon="help-circle-outline" title="Support" description="Troubleshooting and ways to report an issue." onPress={() => router.push("/legal/support")} />
          <View style={styles.dividerCompact} />
          <SettingsRow icon="information-circle-outline" title="About" description={`Timesheet Mobile version ${version}`} onPress={() => router.push("/legal/about")} />
        </View>

        <Text style={styles.footerText}>Version {version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:"#F7F8FC"},container:{padding:22,paddingBottom:44},loadingContainer:{flex:1,alignItems:"center",justifyContent:"center"},
  eyebrow:{color:"#2563EB",fontSize:12,fontWeight:"800",letterSpacing:1.5,marginTop:12},title:{color:"#111827",fontSize:32,fontWeight:"800",marginTop:5},subtitle:{color:"#64748B",fontSize:16,lineHeight:23,marginTop:8,marginBottom:24},
  sectionLabel:{color:"#64748B",fontSize:12,fontWeight:"800",letterSpacing:1.2,marginBottom:10},sectionSpacing:{marginTop:28},card:{backgroundColor:"#FFFFFF",borderRadius:22,padding:18,shadowColor:"#0F172A",shadowOpacity:0.06,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:3},
  settingRow:{flexDirection:"row",alignItems:"center"},navigationRow:{flexDirection:"row",alignItems:"center",minHeight:62},iconBox:{width:44,height:44,borderRadius:14,backgroundColor:"#EFF6FF",alignItems:"center",justifyContent:"center",marginRight:13},settingCopy:{flex:1,paddingRight:12},settingTitle:{color:"#0F172A",fontSize:16,fontWeight:"800"},settingDescription:{color:"#64748B",fontSize:13,lineHeight:19,marginTop:4},
  divider:{height:1,backgroundColor:"#E2E8F0",marginVertical:18},dividerCompact:{height:1,backgroundColor:"#E2E8F0",marginVertical:10,marginLeft:57},label:{color:"#334155",fontSize:13,fontWeight:"800",marginBottom:11},optionRow:{flexDirection:"row",gap:8},option:{flex:1,minHeight:42,borderRadius:12,borderWidth:1,borderColor:"#CBD5E1",alignItems:"center",justifyContent:"center",backgroundColor:"#FFFFFF"},optionSelected:{backgroundColor:"#2563EB",borderColor:"#2563EB"},optionDisabled:{opacity:0.4},optionText:{color:"#475569",fontWeight:"800"},optionTextSelected:{color:"#FFFFFF"},
  testButton:{minHeight:50,borderRadius:14,backgroundColor:"#EFF6FF",marginTop:18,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:9},testButtonDisabled:{opacity:0.5},testButtonText:{color:"#2563EB",fontSize:15,fontWeight:"800"},pressed:{opacity:0.75},infoCard:{flexDirection:"row",alignItems:"flex-start",gap:10,backgroundColor:"#EEF2F7",borderRadius:16,padding:15,marginTop:18},infoText:{flex:1,color:"#475569",fontSize:13,lineHeight:19},
  webNotice:{flexDirection:"row",alignItems:"center",gap:10,backgroundColor:"#FFFBEB",borderWidth:1,borderColor:"#FDE68A",borderRadius:16,padding:14,marginBottom:18},webNoticeText:{flex:1,color:"#92400E",fontSize:13,lineHeight:19,fontWeight:"600"},footerText:{color:"#94A3B8",fontSize:12,textAlign:"center",marginTop:22},
});
